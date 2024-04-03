// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import axios, { AxiosResponse } from 'axios';
import { getDefaultEntryPointAddress, getDefaultSimpleAccountFactoryAddress } from "@alchemy/aa-core";
import { getChain } from '@alchemy/aa-core';

// get chain information based on the RPC endpoint URL
interface Options {
  method: string;
  url: string;
  headers: {
    accept: string;
    'content-type': string;
  },
  data: {
    id: number;
    jsonrpc: string;
    method: string;
  }
}

interface ChainInfo { 
  chainId: number,
  chainName: string,
  defaultEntryPointAddress: string,
  defaultSimpleAccountFactoryAddress: string,
}

async function getChainInfo(): Promise<ChainInfo> { 
  return new Promise(async (resolve, reject) => {
    try { 
      const options: Options = {
        method: 'POST',
        url: `${process.env.RPC_ENDPOINT}`, //depends on the user exporting the RPC_ENDPOINT on the terminal before running `cdk deploy`.
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        data: { "id": 1, "jsonrpc": "2.0", "method": "eth_chainId" },
      };

      const response: AxiosResponse = await axios.request(options) as any;
      const chain = getChain(parseInt(response.data.result)); 
      const defaultEntryPointAddress: string = getDefaultEntryPointAddress(chain);
      const defaultSimpleAccountFactoryAddress: string = getDefaultSimpleAccountFactoryAddress(chain);
      const chainInfo: ChainInfo = { 
        chainId: parseInt(response.data.result),
        chainName: (chain.name).toLowerCase(),
        defaultEntryPointAddress,
        defaultSimpleAccountFactoryAddress,
      }
      resolve(chainInfo);
    } catch { 
      const chainInfo: ChainInfo = {
        chainId: 11155111,
        chainName: 'sepolia',
        defaultEntryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
        defaultSimpleAccountFactoryAddress: '0x9406Cc6185a346906296840746125a0E44976454',
      }
      reject(chainInfo); //if we can't get the testnet chainId, defaults to Sepolia
    }
  })
}

export class Web3WorkshopParametersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // CloudFormation parameter section
    const rpcEndpoint = new cdk.CfnParameter(this, 'rpcEndpoint', {
      description: 'Blockchain RPC endpoint',
      default: 'my.rpc.endpoint',
      // allowedPattern: '(.|\s)*\S',
      noEcho: true,
    });

    const chainId = new cdk.CfnParameter(this, 'chainId', {
      description: 'Blockchain chainId',
      default: '11155111',     
    });

    const chainName = new cdk.CfnParameter(this, 'chainName', {
      description: 'Blockchain chainName',
      default: 'sepolia',
    });

    const paymasterEndpoint = new cdk.CfnParameter(this, 'paymasterEndpoint', {
      description: 'Paymaster endpoint',
      default: 'my.paymaster.endpoint',
    });
    
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

    const alchemyTestnetAPIKey = new cdk.CfnParameter(this,
      'alchemyTestnetAPIKey',
      {
        description: 'The Alchemy API Key for the a Testnet network - as a default, we use Sepolia',
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

    new ssm.StringParameter(this, 'paymasterEndpointSSMParameter', {
      stringValue: 'none',
      parameterName: '/web3/paymaster_endpoint',
    })
    
    getChainInfo().then(chainInfo => {
      console.log(`Got chain information: \nName: ${chainInfo.chainName}\nId: ${chainInfo.chainId}\nEntryPointAddress: ${chainInfo.defaultEntryPointAddress}\nAccountFactoryAddress: ${chainInfo.defaultSimpleAccountFactoryAddress}`);
      new ssm.StringParameter(this, 'chainNameSSMParameter', {
        stringValue: chainInfo.chainName,
        parameterName: '/web3/chain_name',
      });
      
      new ssm.StringParameter(this, 'chainIdSSMParameter', {
        stringValue: (chainInfo.chainId).toString(),
        parameterName: '/web3/chain_id',
      });

      new ssm.StringParameter(this, 'aaEntrypointSSMParameter', {
        stringValue: chainInfo.defaultEntryPointAddress,
        parameterName: '/web3/aa/entrypoint_address',
      });

      new ssm.StringParameter(this, 'aaAccountFactoryAddressSSMParameter', {
        stringValue: chainInfo.defaultSimpleAccountFactoryAddress,
        parameterName: '/web3/aa/account_factory_address',
      });

    }).catch(error => {
      console.log(`Error getting chain id. Defaults to Sepolia testnet.`)
    });

    new ssm.StringParameter(this, 'conterfactualEndpoint', {
      stringValue: paymasterEndpoint.valueAsString,
      parameterName: '/web3/rpc_endpoint_counterfactual',
    });

    new ssm.StringParameter(this, 'alchemyPolicyIdTestnetSSMParameter', {
      stringValue: alchemyPolicyId.valueAsString,
      parameterName: '/web3/aa/alchemy_testnet_policy_id',
    })

    new ssm.StringParameter(this, 'testnetAPIKeySSMParameter', {
      stringValue: alchemyTestnetAPIKey.valueAsString,
      parameterName: '/web3/aa/alchemy_api_key',
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
