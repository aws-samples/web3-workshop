// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const path = require('path')
const fs = require('fs')
const {
  RemovalPolicy,
  Aspects,
  Duration,
  CustomResource,
  CustomResourceProvider,
  Size,
  Stack,
  Tags,
  Fn,
  CfnOutput,
} = require('aws-cdk-lib')
const { AutoScalingGroup } = require('aws-cdk-lib/aws-autoscaling')
const {
  Vpc,
  Peer,
  Port,
  InstanceType,
  SecurityGroup,
  SubnetType,
  LaunchTemplate,
  UserData,
  VpcEndpoint,
  InterfaceVpcEndpointAwsService,
  Volume,
  EbsDeviceVolumeType,
  CfnLaunchTemplate,
  BlockDeviceVolume,
} = require('aws-cdk-lib/aws-ec2')
const {
  Cluster,
  EcsOptimizedImage,
  AsgCapacityProvider,
  Ec2TaskDefinition,
  LogDrivers,
  ContainerImage,
  Protocol,
  Secret,
  PlacementConstraint,
  ContainerDependencyCondition,
  Ec2Service,
} = require('aws-cdk-lib/aws-ecs')
const {
  Role,
  ServicePrincipal,
  ManagedPolicy,
  PolicyStatement,
  AnyPrincipal,
} = require('aws-cdk-lib/aws-iam')
const { Runtime } = require('aws-cdk-lib/aws-lambda')
const { NodejsFunction } = require('aws-cdk-lib/aws-lambda-nodejs')
const { RetentionDays } = require('aws-cdk-lib/aws-logs')
const {
  DatabaseCluster,
  DatabaseClusterEngine,
  AuroraPostgresEngineVersion,
  CfnDBCluster,
  DatabaseInstance,
  DatabaseInstanceEngine,
  PostgresEngineVersion,
  ParameterGroup,
  Credentials,
  ClusterInstance,
} = require('aws-cdk-lib/aws-rds')
const { Construct } = require('constructs')
const { Provider } = require('aws-cdk-lib/custom-resources')
const { FileSystem, AccessPoint } = require('aws-cdk-lib/aws-efs')
const { Bucket, BlockPublicAccess } = require('aws-cdk-lib/aws-s3')
const {
  ApplicationLoadBalancer,
  ApplicationProtocol,
} = require('aws-cdk-lib/aws-elasticloadbalancingv2')
const { NagSuppressions } = require('cdk-nag')

class TheGraphCluster extends Construct {
  /**
   *
   * @param {cdk.Construct} scope
   * @param {string} id
   * @param {cdk.StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props)

    // Map from chainId to networkName
    const networkNames = new Map([
      [1, 'mainnet'],
      [3, 'ropsten'],
      [4, 'rinkeby'],
      [5, 'goerli'],
      [137, 'matic'],
      [80001, 'mumbai'],
    ])

    const networkName = networkNames.get(props.chainId)

    // use the default VPC
    const vpc = Vpc.fromLookup(this, 'Vpc', { isDefault: true })

    // VPC Endpoint to SSM
    vpc.addInterfaceEndpoint('secretsmanagerVPCE', {
      service: InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    })

    // ALB SG open for queries from the internet to the ALB
    const albSg = new SecurityGroup(this, 'ALB-SG', {
      vpc: vpc,
      description: 'ALB SG',
    })
    Tags.of(albSg).add('Name', 'ALB-SG')
    albSg.addIngressRule(Peer.anyIpv4(), Port.tcp(80), 'allow ALB queries')

    // The Graph SG for ECS EC2 open for IPFS p2p communication and ALB SG
    const graphServiceSg = new SecurityGroup(this, `EC2SG`, {
      vpc: vpc,
      description: 'TheGraph SG',
    })
    Tags.of(graphServiceSg).add('Name', 'TheGraph-SG')

    graphServiceSg.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(4001),
      'IPFS node P2P communication'
    )
    graphServiceSg.addIngressRule(
      Peer.anyIpv4(),
      Port.udp(4001),
      'IPFS node P2P communication'
    )
    graphServiceSg.addIngressRule(
      albSg,
      Port.tcp(80),
      'Query the graph node from ALB'
    )
    graphServiceSg.addIngressRule(
      albSg,
      Port.tcp(8030),
      'Query the graph node status from ALB'
    )

    // DB SG open for graphService SG
    const dbSg = new SecurityGroup(this, `DB0SG`, {
      vpc: vpc,
      description: 'DB Security Group',
    })
    Tags.of(dbSg).add('Name', 'DB-SG')
    dbSg.addIngressRule(graphServiceSg, Port.tcp(5432), 'access for DB')

    // EFS SG open for graphService SG
    const efsSg = new SecurityGroup(this, 'efsSG', {
      vpc: vpc,
      description: 'EFS SG allowing inbound NFS traffic',
    })
    Tags.of(efsSg).add('Name', 'EFS-SG')
    efsSg.addIngressRule(graphServiceSg, Port.tcp(2049), 'allow NFS traffic')

    // Lambda SG for custom (Lambda) resource to init DB
    const lambdaSG = new SecurityGroup(this, 'LambdaSG', {
      vpc,
    })
    Tags.of(lambdaSG).add('Name', 'Lambda-SG')
    dbSg.addIngressRule(lambdaSG, Port.tcp(5432), 'Lambda to Postgres database')

    // Deployment SG open for local DEV machine
    const subgraphDeploymentSG = new SecurityGroup(
      this,
      'SubgraphDeplyomentSG',
      {
        vpc,
        description: 'Allowing deployment access from local dev machine',
      }
    )

    Tags.of(subgraphDeploymentSG).add('Name', 'SubgraphDeployment-SG')

    if (props.allowedIP) {
      subgraphDeploymentSG.addIngressRule(
        Peer.ipv4(`${props.allowedIP}/32`),
        Port.tcp(80),
        'GraphQL queries'
      )
      subgraphDeploymentSG.addIngressRule(
        Peer.ipv4(`${props.allowedIP}/32`),
        Port.tcp(5001),
        'IPFS node'
      )
      subgraphDeploymentSG.addIngressRule(
        Peer.ipv4(`${props.allowedIP}/32`),
        Port.tcp(8020),
        'theGraph deployments'
      )
      subgraphDeploymentSG.addIngressRule(
        Peer.ipv4(`${props.allowedIP}/32`),
        Port.tcp(8030),
        'theGraph admin metadata (GraphQL)'
      )
    }

    if (props.allowedSG) {
      subgraphDeploymentSG.addIngressRule(
        Peer.securityGroupId(props.allowedSG),
        Port.tcp(80),
        'GraphQL queries'
      )
      subgraphDeploymentSG.addIngressRule(
        Peer.securityGroupId(props.allowedSG),
        Port.tcp(5001),
        'IPFS node'
      )
      subgraphDeploymentSG.addIngressRule(
        Peer.securityGroupId(props.allowedSG),
        Port.tcp(8020),
        'theGraph deployments'
      )
      subgraphDeploymentSG.addIngressRule(
        Peer.securityGroupId(props.allowedSG),
        Port.tcp(8030),
        'theGraph admin metadata (GraphQL)'
      )
    }

    // const databaseCredentialsSecret = new Secret(this, "tds-db-credentials", {
    //   secretName: `theGraph-db-credentials`,
    //   generateSecretString: {
    //     secretStringTemplate: JSON.stringify({
    //       username: "dbUser",
    //     }),
    //     excludePunctuation: true,
    //     includeSpace: false,
    //     generateStringKey: "password",
    //   },
    // });

    const dbName = 'the_graph_db'

    // RDS instance
    const dbInstance = new DatabaseInstance(this, 'DB-instance', {
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_15,
      }),
      // optional, defaults to m5.large
      // instanceType: new InstanceType(props.dbInstanceType),
      // credentials: Credentials.fromSecret(databaseCredentialsSecret), // Optional - will default to 'admin' username and generated password
      vpc,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
      },
      // databaseName: "postgres",
      storageEncrypted: true,
      multiAz: false, // explictly false because we're in a workshop setting
      removalPolicy: RemovalPolicy.DESTROY,
      publiclyAccessible: false,
      securityGroups: [dbSg],
      port: 5432, // postgres port
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
        availabilityZones: [
          Stack.of(this).availabilityZones[0],
          Stack.of(this).availabilityZones[1],
        ],
      },
    })

    // Aurora serverless
    // const dbEngine = DatabaseClusterEngine.auroraPostgres({
    //   version: AuroraPostgresEngineVersion.VER_15_2,
    // })
    // const dbParameterGroup = new ParameterGroup(this, 'DbParameterGroup', {
    //   engine: dbEngine,
    //   parameters: {
    //     client_encoding: 'UTF8',
    //   },
    // })

    // const dbInstance = new DatabaseCluster(this, 'DbCluster', {
    //   engine: dbEngine,
    //   // instances: 1,
    //   // defaultDatabaseName: 'test',
    //   parameterGroup: dbParameterGroup,
    //   // credentials: Credentials.fromSecret(databaseCredentialsSecret),
    //   removalPolicy: RemovalPolicy.DESTROY,
    //   vpc,
    //   securityGroups: [dbSg],
    //   storageEncrypted: true,
    //   vpcSubnets: {
    //     subnetType: SubnetType.PUBLIC,
    //     availabilityZones: [
    //       Stack.of(this).availabilityZones[0],
    //       Stack.of(this).availabilityZones[1],
    //     ],
    //   },
    //   serverlessV2MinCapacity: 0.5,
    //   serverlessV2MaxCapacity: 1,
    //   writer: ClusterInstance.serverlessV2('dbWriter', {
    //     autoMinorVersionUpgrade: true,
    //     publiclyAccessible: true,
    //   }),
    //   readers: [
    //     ClusterInstance.serverlessV2('dbReader', { scaleWithWriter: true }),
    //   ],
    //   port: 5432, // postgres port
    // })

    // add capacity to the db cluster to enable scaling
    // Aspects.of(dbInstance).add({
    //   visit(node) {
    //     if (node instanceof CfnDBCluster) {
    //       node.serverlessV2ScalingConfiguration = {
    //         minCapacity: 0.5,
    //         maxCapacity: 1,
    //       };
    //     }
    //   },
    // });

    const createDBLambda = new NodejsFunction(this, 'createDBLambda', {
      // entry: path.join(__dirname, '../src/lambdas/dbCreation', 'dbCreationAurora.js'),
      entry: path.join(
        __dirname,
        '../src/lambdas/dbCreation',
        'dbCreationRDS.js'
      ),
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
          'pg-native',
        ],
      },
      // logRetention: RetentionDays.ONE_WEEK,
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.minutes(3), // Default is 3 seconds
      memorySize: 256,
      vpc,
      allowPublicSubnet: true,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
        availabilityZones: [
          Stack.of(this).availabilityZones[0],
          Stack.of(this).availabilityZones[1],
        ],
      },
      securityGroups: [lambdaSG],
    })

    dbInstance.secret.grantRead(createDBLambda)

    // Define the custom resource
    const createDBCustomResourceProvider = new Provider(
      this,
      'createDBCustomResourceProvider',
      {
        onEventHandler: createDBLambda,
        // logRetention: RetentionDays.ONE_DAY,
        // role: createDBCustomResourceRole,
      }
    )

    // for Aurora Serverless
    // const createDBCustomResource = new CustomResource(
    //   this,
    //   'createDBCustomResource',
    //   {
    //     serviceToken: createDBCustomResourceProvider.serviceToken,
    //     properties: {
    //       secretArn: dbInstance.secret.secretArn,
    //       dbName: dbName,
    //     },
    //   }
    // )

    // for RDS
    const createDBCustomResource = new CustomResource(
      this,
      'createDBCustomResource',
      {
        serviceToken: createDBCustomResourceProvider.serviceToken,
        properties: {
          secretArn: dbInstance.secret.secretArn,
          dbName: dbName,
          dbHost: dbInstance.dbInstanceEndpointAddress,
          dbPort: dbInstance.dbInstanceEndpointPort,
        },
      }
    )

    // Add a dependency to ensure that the custom resource runs after the cluster has been created
    createDBCustomResource.node.addDependency(dbInstance)

    // ECS Cluster
    const cluster = new Cluster(this, 'Ec2Cluster', {
      vpc: vpc,
      containerInsights: true,
    })

    // Persistent volume: EFS
    const fileSystem = new FileSystem(this, 'EfsFileSystem', {
      vpc,
      securityGroup: efsSg,
      removalPolicy: RemovalPolicy.DESTROY,
      encrypted: true,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
        availabilityZones: [
          Stack.of(this).availabilityZones[0],
          Stack.of(this).availabilityZones[1],
        ],
      },
    })

    fileSystem.addToResourcePolicy(
      new PolicyStatement({
        principals: [new AnyPrincipal()],
        actions: ['elasticfilesystem:ClientRootAccess'],
        resources: ['*'],
      })
    )

    const accessPoint = new AccessPoint(this, 'volumeAccessPoint', {
      fileSystem: fileSystem,
      path: '/data/ipfs',
      createAcl: {
        ownerUid: '1000',
        ownerGid: '100',
        permissions: '755',
      },
      posixUser: {
        uid: '1000',
        gid: '100',
      },
    })

    const nodeClientRole = new Role(this, 'NodeClientRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
      ],
    })

    const nodeClientLaunchTemplate = new LaunchTemplate(
      this,
      'nodeClientLaunchTemplate',
      {
        machineImage: EcsOptimizedImage.amazonLinux2(),
        instanceType: new InstanceType(props.graphInstanceType),
        securityGroup: graphServiceSg,
        userData: UserData.forLinux(),
        role: nodeClientRole,
        blockDevices: [
          {
            deviceName: '/dev/xvda',
            volume: BlockDeviceVolume.ebs(30, {
              encrypted: true,
              volumeType: EbsDeviceVolumeType.GP2,
            }),
          },
        ],
      }
    )

    const autoScalingGroup = new AutoScalingGroup(this, 'ASG', {
      vpc,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
        availabilityZones: [
          Stack.of(this).availabilityZones[0],
          Stack.of(this).availabilityZones[1],
        ],
      },
      launchTemplate: nodeClientLaunchTemplate,
      minCapacity: 1,
      maxCapacity: 1,
    })

    nodeClientLaunchTemplate.connections.addSecurityGroup(subgraphDeploymentSG)

    const capacityProvider = new AsgCapacityProvider(this, 'CapacityProvider', {
      autoScalingGroup: autoScalingGroup,
      capacityProviderName: cluster.cluster_name,
      enableManagedTerminationProtection: false,
      enableManagedScaling: false,
    })

    cluster.addAsgCapacityProvider(capacityProvider)

    const efsVolumeName = 'efsDataVolume'

    const taskDefinition = new Ec2TaskDefinition(this, 'GraphNodeTaskDef', {
      volumes: [
        {
          name: efsVolumeName,
          efsVolumeConfiguration: {
            fileSystemId: fileSystem.fileSystemId,
            transitEncryption: 'ENABLED',
            authorizationConfig: {
              accessPointId: accessPoint.accessPointId,
              iam: 'ENABLED',
            },
          },
        },
      ],
    })

    // taskDefinition.node.addDependency(fileSystem)

    taskDefinition.addToTaskRolePolicy(
      new PolicyStatement({
        actions: [
          'elasticfilesystem:ClientRootAccess',
          'elasticfilesystem:ClientWrite',
          'elasticfilesystem:ClientMount',
          'elasticfilesystem:DescribeMountTargets',
        ],
        resources: [fileSystem.fileSystemArn],
      })
    )

    // taskDefinition.addToExecutionRolePolicy(new PolicyStatement({
    //   actions: [
    //     "elasticfilesystem:ClientRootAccess",
    //     "elasticfilesystem:ClientWrite",
    //     "elasticfilesystem:ClientMount",
    //     "elasticfilesystem:DescribeMountTargets",
    //   ],
    //   resources: [fileSystem.fileSystemArn]
    // })
    // )

    // Creates IPFS Container
    const ipfsContainer = taskDefinition.addContainer('ipfs', {
      logging: LogDrivers.awsLogs({
        streamPrefix: 'IPFS',
        // logRetention: RetentionDays.ONE_WEEK,
      }),
      image: ContainerImage.fromRegistry('ipfs/kubo:v0.19.1'),
      memoryLimitMiB: 3072,
      healthCheck: {
        command: [
          'CMD-SHELL',
          'ipfs dag stat /ipfs/QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn || exit 1',
        ],
        interval: Duration.seconds(120),
        retries: 10,
      },
      portMappings: [
        {
          containerPort: 5001,
          hostPort: 5001,
          protocol: Protocol.TCP,
        },
        {
          containerPort: 4001,
          hostPort: 4001,
          protocol: Protocol.TCP,
        },
        {
          containerPort: 4001,
          hostPort: 4001,
          protocol: Protocol.UDP,
        },
      ],
    })

    // fileSystem.grant(taskDefinition.executionRole, ['elasticfilesystem:*'])
    // fileSystem.grant(taskDefinition.taskRole, ['elasticfilesystem:*'])

    // Mounts the host ipfs volume onto the ipfs container
    const ipfsMountPoint = {
      containerPath: '/data/ipfs',
      sourceVolume: efsVolumeName,
      readOnly: false,
    }
    ipfsContainer.addMountPoints(ipfsMountPoint)

    const environmentVars = {
      GRAPH_LOG: props.logLevel,
      ipfs: '172.17.0.1:5001',
      ethereum: networkName + ':' + props.clientUrl,
      postgres_db: dbName,
      postgres_host: dbInstance.dbInstanceEndpointAddress,
      postgres_port: dbInstance.dbInstanceEndpointPort,
    }

    // // Creates Graph Node Container
    const graphnodeContainer = taskDefinition.addContainer('graph-node', {
      logging: LogDrivers.awsLogs({
        streamPrefix: 'TheGraph',
        // logRetention: RetentionDays.ONE_WEEK,
      }),
      image: ContainerImage.fromRegistry('graphprotocol/graph-node:v0.30.0'),
      memoryLimitMiB: 8192,
      environment: environmentVars,
      // healthCheck: {
      //   command: ["CMD", "curl http://localhost:8040 || exit 1"],
      //   // command: ["CMD-SHELL", "curl --location 'http://localhost:8030/graphql' --header 'Content-Type: application/json' --data '{\"query\":\"{ indexingStatuses { health chains { network latestBlock {number}lastHealthyBlock { number } } } }\",\"variables\":{}}' || exit 1"],
      //   interval: Duration.seconds(300),
      //   retries: 10
      // },
      secrets: {
        // postgres_host: Secret.fromSecretsManager(dbInstance.secret, 'host'),
        // postgres_port: Secret.fromSecretsManager(dbInstance.secret, 'port'),
        postgres_user: Secret.fromSecretsManager(dbInstance.secret, 'username'),
        postgres_pass: Secret.fromSecretsManager(dbInstance.secret, 'password'),
      },
      portMappings: [
        {
          containerPort: 8000,
          hostPort: 80,
          protocol: Protocol.TCP,
        },
        {
          containerPort: 8001,
          hostPort: 8001,
          protocol: Protocol.TCP,
        },
        {
          containerPort: 8020,
          hostPort: 8020,
          protocol: Protocol.TCP,
        },
        {
          containerPort: 8030,
          hostPort: 8030,
          protocol: Protocol.TCP,
        },
        {
          containerPort: 8040,
          hostPort: 8040,
          protocol: Protocol.TCP,
        },
      ],
    })

    graphnodeContainer.addContainerDependencies({
      container: ipfsContainer,
      condition: ContainerDependencyCondition.HEALTHY,
    })

    // // Creates an ECS Service
    // const service = new ApplicationLoadBalancedEc2Service(this, "ALB-EC2-Service", {
    //   cluster: cluster,
    //   taskDefinition: taskDefinition,
    //   desired_count: 1,
    //   publicLoadBalancer: false,
    //   openListener: false,
    //   // placementConstraints: [PlacementConstraint.memberOf(`attribute:ecs.availability-zone==${Stack.of(this).availabilityZones[0]}`)]
    // }
    // )
    // service.targetGroup.configureHealthCheck({
    //   path: '/',
    //   port: '8030',
    //   interval: Duration.seconds(120),
    //   unhealthyThresholdCount: 5,
    // })

    // service.loadBalancer.connections.addSecurityGroup(securityGroup);

    // access log bucket
    // const accessLogsBucket = new Bucket(this, 'accessLogsBucket', {
    //   blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    //   enforceSSL: true,
    //   serverAccessLogsPrefix: 'bucketaccesslogs/',
    // })
    // accessLogsBucket.grantPut(
    //   new ServicePrincipal('delivery.logs.amazonaws.com')
    // )

    const service = new Ec2Service(this, 'EC2-Service', {
      cluster: cluster,
      taskDefinition: taskDefinition,
      desiredCount: 1,
    })

    service.node.addDependency(createDBCustomResource)

    const alb_port80 = new ApplicationLoadBalancer(this, 'ALB-Port80', {
      vpc: vpc,
      internetFacing: false,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
        availabilityZones: [
          Stack.of(this).availabilityZones[0],
          Stack.of(this).availabilityZones[1],
        ],
      },
      securityGroup: albSg,
    })

    const listener_port80 = alb_port80.addListener('Listener', {
      port: 80,
      protocol: ApplicationProtocol.HTTP,
      open: true,
    })

    const tg_p80 = listener_port80.addTargets('GraphECS', {
      port: 80,
      protocol: ApplicationProtocol.HTTP,
      targets: [autoScalingGroup],
    })

    tg_p80.configureHealthCheck({
      path: '/',
      port: '8030',
      interval: Duration.seconds(120),
      unhealthyThresholdCount: 5,
    })

    // alb_port80.logAccessLogs(accessLogsBucket, 'port80')
    // alb_port80.connections.addSecurityGroup(vpcLinkSg);

    const alb_port8030 = new ApplicationLoadBalancer(this, 'ALB-Port8030', {
      vpc: vpc,
      internetFacing: false,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
        availabilityZones: [
          Stack.of(this).availabilityZones[0],
          Stack.of(this).availabilityZones[1],
        ],
      },
      securityGroup: albSg,
    })

    const listener_port8030 = alb_port8030.addListener('Listener', {
      port: 8030,
      protocol: ApplicationProtocol.HTTP,
      open: true,
    })

    const tg_p8030 = listener_port8030.addTargets('GraphECS', {
      port: 8030,
      protocol: ApplicationProtocol.HTTP,
      targets: [autoScalingGroup],
    })

    tg_p8030.configureHealthCheck({
      path: '/',
      port: '8030',
      interval: Duration.seconds(120),
      unhealthyThresholdCount: 5,
    })

    // alb_port8030.logAccessLogs(accessLogsBucket, 'port8030')
    // alb_port8030.connections.addSecurityGroup(vpcLinkSg);

    // this.service = service
    // this.vpc = vpc
    // this.securityGroup = securityGroup
    this.albListenerPort80 = listener_port80
    this.albListenerPort8030 = listener_port8030
    this.albPort80 = alb_port80
    this.albSecurityGroup = albSg

    // new cdk.CfnOutput(this, 'dbAddess', { value: dbInstance.dbInstanceEndpointAddress })
    // new cdk.CfnOutput(this, 'dbPort', { value: dbInstance.dbInstanceEndpointPort })

    // cdk-nag suppressions
    NagSuppressions.addResourceSuppressions(
      graphServiceSg,
      [
        {
          id: 'AwsSolutions-EC23',
          reason: 'SG for graph node must sync IPFS data across internet',
        },
      ],
      true
    )

    NagSuppressions.addResourceSuppressions(
      albSg,
      [
        {
          id: 'AwsSolutions-EC23',
          reason: 'ALB should be accessible from the internet',
        },
      ],
      true
    )

    NagSuppressions.addResourceSuppressions(
      dbInstance,
      [
        {
          id: 'AwsSolutions-SMG4',
          reason:
            'secrets rotation disabled because application expects secrets in env vars',
        },
        {
          id: 'AwsSolutions-RDS3',
          reason:
            'Multi-AZ explicitly disabled because we are in a workshop setting and do not need HA',
        },
        {
          id: 'AwsSolutions-RDS11',
          reason:
            'Default port explicitly ok, because graph expects the DB on that port',
        },
        {
          id: 'AwsSolutions-RDS6',
          reason:
            'Graph client does not support to retrieve token before DB access',
        },
        {
          id: 'AwsSolutions-RDS10',
          reason:
            'deletion protection disabled because data can be re-created from blockchain',
        },
      ],
      true
    )

    NagSuppressions.addResourceSuppressions(
      autoScalingGroup,
      [
        { id: 'AwsSolutions-L1', reason: 'lambda generated by CDK' },
        { id: 'AwsSolutions-AS3', reason: 'lorem ipsum' },
        {
          id: 'AwsSolutions-EC26',
          reason: 'only using EFS for storage, no un-encrypted EBS',
        },
        {
          id: 'AwsSolutions-SNS2',
          reason: 'topic genereated by CDK, does not have sensitive data',
        },
        {
          id: 'AwsSolutions-SNS3',
          reason: 'topic genereated by CDK, does not have sensitive data',
        },
      ],

      true
    )

    NagSuppressions.addResourceSuppressions(
      createDBCustomResourceProvider,
      [{ id: 'AwsSolutions-L1', reason: 'lambda generated by CDK' }],
      true
    )

    NagSuppressions.addResourceSuppressions(
      taskDefinition,
      [
        {
          id: 'AwsSolutions-ECS2',
          reason: 'only non-sensitive, fixed data is passed as env vars',
        },
      ],
      true
    )

    NagSuppressions.addResourceSuppressions(
      this,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'All policies managed by CDK and reflect minimal permissions',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'All policies managed by CDK and reflect minimal permissions',
        },
        {
          id: 'AwsSolutions-ELB2',
          reason: 'Access Logs not required for workshop setting',
        },
      ],
      true
    )
  }
}

module.exports = { TheGraphCluster }
