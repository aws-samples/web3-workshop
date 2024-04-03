// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { PolicyStatement, Role, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export class BlockchainTransactionLambdaCdkStack extends cdk.Stack {
  blockchainFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const secretARN = `arn:aws:secretsmanager:${this.region}:${this.account}:secret:*`;
    const lambdaRole = new Role(this, 'Blockchain-Lambda-Role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com')
    });

    lambdaRole.addToPolicy(
      new PolicyStatement({
        actions: [
          'secretsmanager:GetRandomPassword',
          'secretsmanager:GetResourcePolicy',
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret',
          'secretsmanager:ListSecretVersionIds'
        ],
        resources: [secretARN]
      })
    );

    // Get signing Lambda function ARN to give this Lambda permissions to invoke it

    const ARN_LAMBDA_SIGNING = ssm.StringParameter.valueForStringParameter(
      this,
      '/app/signing/lambda_arn'
    );

    lambdaRole.addToPolicy(
      new PolicyStatement({
        actions: ['lambda:InvokeFunction', 'lambda:InvokeAsync'],
        resources: [ARN_LAMBDA_SIGNING]
      })
    );

    // Get S3 asset bucket ARN to give this Lambda permissions to read from it

    const ARN_S3_ASSET_BUCKET = ssm.StringParameter.valueForStringParameter(
      this,
      '/app/assets/s3bucketurl'
    );

    lambdaRole.addToPolicy(
      new PolicyStatement({
        actions: ['s3:ListBucket'],
        resources: [ARN_S3_ASSET_BUCKET]
      })
    );


    // todo provide folder via environment during deployment
    const sentenceNFTBucket = ARN_S3_ASSET_BUCKET + '/Web3WorkshopNFTPipel/*';
    const genAINFTBucket = ARN_S3_ASSET_BUCKET + '/Web3WorkshopGenAINFT/*';
    lambdaRole.addToPolicy(
      new PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [sentenceNFTBucket, genAINFTBucket]
      })
    );

    // Give this Lambda permission to read SSM params at runtime

    const parameterStoreWeb3ARN = `arn:aws:ssm:${this.region}:${this.account}:parameter/web3/*`;

    lambdaRole.addToPolicy(
      new PolicyStatement({
        actions: ['ssm:DescribeParameters', 'ssm:GetParameter', 'ssm:PutParameter'],
        resources: [parameterStoreWeb3ARN]
      })
    );

    lambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
    );
    lambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
    );

    /* Get values from SSM for Lambda Environment Variables */

    // Blockchain ID

    const CHAIN_ID = ssm.StringParameter.valueForStringParameter(this, '/web3/chain_id');

    // Ethereum node RPC endpoint

    const RPC_ENDPOINT = ssm.StringParameter.valueForStringParameter(this, '/web3/rpc_endpoint');

    // Account Abstraction entrypoint address

    const AA_ENTRY_POINT_ADDRESS = ssm.StringParameter.valueForStringParameter(
      this,
      '/web3/aa/entrypoint_address'
    );

    // Account Abstraction wallet factory address

    const AA_WALLET_FACTORY_ADDRESS = ssm.StringParameter.valueForStringParameter(
      this,
      '/web3/aa/account_factory_address'
    );

    // Account Abstraction Goerli API Key

    const AA_API_KEY_TESTNET = ssm.StringParameter.valueForStringParameter(
      this,
      '/web3/aa/alchemy_api_key'
    );

    // Account Abstraction Goerli Alchemy Policy ID

    const AA_POLICY_ID_TESTNET = ssm.StringParameter.valueForStringParameter(
      this,
      '/web3/aa/alchemy_testnet_policy_id'
    );

    // Graph indexer endpoint

    const INDEXER_ENDPOINT = ssm.StringParameter.valueForStringParameter(
      this,
      '/web3/indexer/queryEndpoint'
    );

    // Create Lambda function

    this.blockchainFunction = new NodejsFunction(this, 'BlockchainTransactionManager', {
      runtime: Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '/./index.ts'),
      handler: 'handler',
      environment: {
        ARN_LAMBDA_SIGNING,
        ARN_S3_ASSET_BUCKET,
        CHAIN_ID,
        RPC_ENDPOINT,
        AA_ENTRY_POINT_ADDRESS,
        AA_WALLET_FACTORY_ADDRESS,
        AA_API_KEY_TESTNET,
        AA_POLICY_ID_TESTNET,
        INDEXER_ENDPOINT
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(120),
      memorySize: 512
    });

    const lambdaARN = new ssm.StringParameter(this, 'BlockchainTransactionManagerLambdaArn', {
      stringValue: this.blockchainFunction.functionArn,
      parameterName: '/app/nft/lambda_arn'
    });
    lambdaARN.node.addDependency(this.blockchainFunction);

    /* Create SSM param placeholders for smart contract addresses */

    // todo to be populated by function after user triggered smart contract deployment

    new ssm.StringParameter(this, 'Erc721SentencesParam', {
      parameterName: '/web3/contracts/erc721/sentences/address',
      stringValue: 'none' 
    });

    new ssm.StringParameter(this, 'Erc721GenAiParam', {
      parameterName: '/web3/contracts/erc721/genai/address',
      stringValue: 'none'
    });
  }
}
