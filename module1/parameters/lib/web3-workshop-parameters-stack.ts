// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as ssm from 'aws-cdk-lib/aws-ssm'

export class Web3WorkshopParametersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // CloudFormation parameter section
    const rpcEndpoint = new cdk.CfnParameter(this, 'rpcEndpoint', {
      description: 'Blockchain RPC endpoint',
      default: 'my.rpc.endpoint',
      // allowedPattern: '(.|\s)*\S',
      noEcho: true,
    })

    const aaEntrypointAddress = new cdk.CfnParameter(
      this,
      'aaEntryPointAddress',
      {
        description: 'AA Entrypoint smart contract address ',
        default: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
      }
    )

    const aaAccountFactoryAddress = new cdk.CfnParameter(
      this,
      'aaAccountFactoryAddress',
      {
        description: 'AA AccountFactory smart contract address',
        default: '0x9406Cc6185a346906296840746125a0E44976454',
      }
    )

    const alchemyPolicyId = new cdk.CfnParameter(this,
      'alchemyPolicyId',
      {
        description: 'The Alchemy Policy ID for the Account Abstraction bundler',
        default: 'my.paymaster.police',
        noEcho: true,
      }
    )

    const sagemakerEndpointAPIURL = new cdk.CfnParameter(this,
      'sagemakerEndpointAPIURL',
      {
        description: 'The SageMaker endpoint URL',
        default: 'none',
        noEcho: true,
      }
    )

    const sagemakerEndpointAPIKEY = new cdk.CfnParameter(this,
      'sagemakerEndpointAPIKEY',
      {
        description: 'The SageMaker endpoint API KEY',
        default: 'none',
        noEcho: true,
      }
    )

    const alchemyGoerliAPIKey = new cdk.CfnParameter(this,
      'alchemyGoerliAPIKey',
      {
        description: 'The Alchemy API Key for the Goerli network',
        noEcho: true,
      }
    )

    const chainId = new cdk.CfnParameter(
      this,
      'chainId',
      {
        description: 'The chain ID for the blockchain',
        default: '5',
      }
    )

    const nftStorageAPIToken = new cdk.CfnParameter(this, 'nftStorageAPIToken', {
      description:
        'The API token for the nft.storage service',
      default: 'my.nft.storage.api.token',
      noEcho: true,
    })

    // SSM parameter section
    new ssm.StringParameter(this, 'rpcEndpointSSMParameter', {
      stringValue: rpcEndpoint.valueAsString,
      parameterName: '/web3/rpc_endpoint',
    })

    new ssm.StringParameter(this, 'chainIdSSMParameter', {
      stringValue: chainId.valueAsString,
      parameterName: '/web3/chain_id',
    })

    new ssm.StringParameter(this, 'alchemyPolicyIdGoerliSSMParameter', {
      stringValue: alchemyPolicyId.valueAsString,
      parameterName: '/web3/aa/goerli_alchemy_policy_id',
    })

    new ssm.StringParameter(this, 'goerliAPIKeySSMParameter', {
      stringValue: alchemyGoerliAPIKey.valueAsString,
      parameterName: '/web3/aa/goerli_api_key',
    })

    new ssm.StringParameter(this, 'aaEntrypointSSMParameter', {
      stringValue: aaEntrypointAddress.valueAsString,
      parameterName: '/web3/aa/entrypoint_address',
    })

    new ssm.StringParameter(this, 'aaAccountFactoryAddressSSMParameter', {
      stringValue: aaAccountFactoryAddress.valueAsString,
      parameterName: '/web3/aa/account_factory_address',
    })

    new ssm.StringParameter(this, 'alchemyPolicyIdParameterParameter', {
      stringValue: alchemyPolicyId.valueAsString,
      parameterName: '/web3/aa/alchemy_policy_id',
    })

    new ssm.StringParameter(this, 'logLevelSSMParameter', {
      stringValue: 'WARNING',
      parameterName: '/app/log_level',
    })

    new ssm.StringParameter(this, 'indexerEndpoint', {
      stringValue: 'none',
      parameterName: '/web3/indexer/queryEndpoint',
    })

    new ssm.StringParameter(this, 'NFTStorageAPIToken', {
      stringValue: nftStorageAPIToken.valueAsString,
      parameterName: '/web3/nftstorage/apitoken'
    })

    new ssm.StringParameter(this, 'SageMakerAPIURL', {
      stringValue: sagemakerEndpointAPIURL.valueAsString,
      parameterName: '/app/sagemaker/endpoint/apiurl'
    })

    new ssm.StringParameter(this, 'SageMakerAPIKEY', {
      stringValue: sagemakerEndpointAPIKEY.valueAsString,
      parameterName: '/app/sagemaker/endpoint/apikey'
    })
  }
}
