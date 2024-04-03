// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { SSM } from 'aws-sdk';
import logger from './logger';
import { Address } from 'abitype';

const ssm: AWS.SSM = new SSM({ region: process.env.AWS_REGION });

export async function putSSMParameter(parameterName: string, parameterValue: string): Promise<void> {
  await ssm.putParameter({
    Name: parameterName,
    Value: parameterValue,
    Type: 'String',
    Overwrite: true
  }).promise();
}

export async function getSSMParameter(parameterName: string): Promise<string> {
  try {
    const parameterStoreData = await ssm.getParameter({ Name: parameterName }).promise();

    return parameterStoreData.Parameter?.Value as string;
  } catch (error) {
    logger.error(`Error getting parameter ${parameterName} from Parameter Store`);
    throw error;
  }
}

export function getEnvironmentVariable(variableName: string) {
  const value = process.env[variableName];

  if (!value) {
    throw new Error(`Environment variable ${variableName} not found`);
  }

  return value;
}

export function getSigningLambdaARN(): string {
  return getEnvironmentVariable('ARN_LAMBDA_SIGNING');
}

export function getS3AssetBucketARN(): string {
  return getEnvironmentVariable('ARN_S3_ASSET_BUCKET');
}

export function getChainID() {
  return getEnvironmentVariable('CHAIN_ID');
}

// do we really need this now we are getting chainId using eth_chainId? 
export function getChainName() {
  const chainId = getEnvironmentVariable('CHAIN_ID');

  if (chainId == '11155111') {
    return 'sepolia';
  }
}

export function getEntryPointAddress(): Address {
  return getEnvironmentVariable('AA_ENTRY_POINT_ADDRESS') as Address;
}

export function getWalletFactoryAddress(): Address {
  return getEnvironmentVariable('AA_WALLET_FACTORY_ADDRESS') as Address;
}

export function getMumbaiAPIKey() {
  return getEnvironmentVariable('AA_API_KEY_MUMBAI'); // not defined on the parameter stack
}

export function getMumbaiAlchemyPolicyID() {
  return getEnvironmentVariable('AA_POLICY_ID_MUMBAI'); // not defined on the parameter stack

}
export function getTestnetAPIKey() {
  return getEnvironmentVariable('AA_API_KEY_TESTNET');
}

export function getTestnetAlchemyPolicyID() {
  return getEnvironmentVariable('AA_POLICY_ID_TESTNET');
}
