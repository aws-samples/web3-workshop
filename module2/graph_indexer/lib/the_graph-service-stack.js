// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const { Stack, Duration, CfnOutput, Tags } = require('aws-cdk-lib')
const { NagSuppressions } = require('cdk-nag')

const {
  HttpApi,
  VpcLink,
  HttpMethod,
  ParameterMapping,
  MappingValue,
} = require('@aws-cdk/aws-apigatewayv2-alpha')
const { TheGraphCluster } = require('./theGraphCluster-construct')
const { Vpc, SubnetType } = require('aws-cdk-lib/aws-ec2')
const {
  HttpAlbIntegration,
} = require('@aws-cdk/aws-apigatewayv2-integrations-alpha')
const { StringParameter } = require('aws-cdk-lib/aws-ssm')
const { LogGroup } = require('aws-cdk-lib/aws-logs')
const { ServicePrincipal } = require('aws-cdk-lib/aws-iam')
const {
  AwsCustomResource,
  PhysicalResourceId,
  AwsCustomResourcePolicy,
} = require('aws-cdk-lib/custom-resources')

class TheGraphServiceStack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props)

    const { graphInstanceType, dbInstanceType, allowedIP } = props

    const logLevel = StringParameter.valueForStringParameter(
      this,
      '/app/log_level'
    )
    const cloud9_sg = StringParameter.valueForStringParameter(
      this,
      '/app/cloud9_sg'
    )
    const allowedSG = cloud9_sg !== 'none' ? undefined : cloud9_sg

    const clientUrl = StringParameter.valueForStringParameter(
      this,
      '/web3/rpc_endpoint'
    )
    // we are using valueFromLookup instead of valueForStringParameter because
    // valueForStringParameter doesn't retrieve the value until deployment. We
    // need it at synth time already, because we are using it as key in the map.
    const chainId = parseInt(
      StringParameter.valueFromLookup(this, '/web3/chain_id')
    )

    // const clientUrl = StringParameter.valueForStringParameter(
    //   this,
    //   "/web3/rpc_endpoint"
    // );

    // we are using valueFromLookup instead of valueForStringParameter because
    // valueForStringParameter doesn't retrieve the value until deployment. We
    // need it at synth time already, because we are using it as key in the map.
    // const chainId = parseInt(
    //   StringParameter.valueFromLookup(this, "/web3/chain_id")
    // );

    // Create the graph cluster
    const graphCluster = new TheGraphCluster(this, 'GraphCluster', {
      logLevel,
      clientUrl,
      chainId,
      graphInstanceType,
      dbInstanceType,
      allowedIP,
      allowedSG,
    })

    const vpc = Vpc.fromLookup(this, 'Vpc', { isDefault: true })

    const vpcLink = new VpcLink(this, 'VpcLink', {
      vpc,
      subnets: {
        subnetType: SubnetType.PUBLIC,
        availabilityZones: [
          Stack.of(this).availabilityZones[0],
          Stack.of(this).availabilityZones[1],
        ],
      },
      securityGroups: [graphCluster.albSecurityGroup],
      description: 'VpcLink for the TheGraph service',
    })

    const httpAPI = new HttpApi(this, 'TheGraphAPI')

    const httpApiLogGroup = new LogGroup(this, 'HttpApiAccessLogs', {
      retention: 7,
    })
    const defaultStage = httpAPI.defaultStage.node.defaultChild
    defaultStage.accessLogSettings = {
      destinationArn: httpApiLogGroup.logGroupArn,
      format: JSON.stringify({
        requestId: '$context.requestId',
        userAgent: '$context.identity.userAgent',
        sourceIp: '$context.identity.sourceIp',
        requestTime: '$context.requestTime',
        httpMethod: '$context.httpMethod',
        path: '$context.path',
        status: '$context.status',
        responseLength: '$context.responseLength',
      }),
    }
    // httpApiLogGroup.grantWrite(new ServicePrincipal('apigateway.amazon.com'))

    const p80Integration = new HttpAlbIntegration(
      'p80Integration',
      graphCluster.albListenerPort80,
      {
        vpcLink: vpcLink,
        method: HttpMethod.POST,
      }
    )

    const p8030Integration = new HttpAlbIntegration(
      'p8030Integration',
      graphCluster.albListenerPort8030,
      {
        vpcLink: vpcLink,
        method: HttpMethod.POST,
      }
    )

    httpAPI.addRoutes({
      path: '/graphql',
      methods: [HttpMethod.POST],
      integration: p8030Integration,
    })

    httpAPI.addRoutes({
      path: '/subgraphs/name/{subgraphName}',
      methods: [HttpMethod.POST],
      integration: p80Integration,
    })

    new CfnOutput(this, 'apiGwEndpoint', { value: httpAPI.apiEndpoint })

    // new StringParameter(this, 'apiGwEndpointParameter', {
    //   parameterName: '/web3/indexer/queryEndpoint',
    //   description: 'Endpoint for querying the indexer',
    //   stringValue: httpAPI.apiEndpoint,
    // })

    // create Customresource to update parameter /web3/indexer/queryEndpoint in parameterstore with value httpAPI.apiEndpoint)
    const updateIndexerUrlCR = new AwsCustomResource(this, 'updateInderxUrl', {
      onUpdate: {
        service: 'SSM',
        action: 'putParameter',
        parameters: {
          Name: '/web3/indexer/queryEndpoint',
          Value: httpAPI.apiEndpoint,
          Type: 'String',
          Overwrite: true,
        },
        physicalResourceId: PhysicalResourceId.of(Date.now().toString()),
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    })

    // Nag Suppressions
    NagSuppressions.addResourceSuppressions(
      httpAPI,
      [
        {
          id: 'AwsSolutions-APIG4',
          reason: 'no authorization to set boundaries for the construct',
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
          id: 'AwsSolutions-L1',
          reason: 'lambda runtime managed by CDK custom resource framework',
        },
      ],
      true
    )
  }
}

module.exports = { TheGraphServiceStack }
