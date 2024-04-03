// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Address } from 'abitype';
import {
  SimpleSmartContractAccount,
  type SimpleSmartAccountOwner,
  UserOperationReceipt
} from '@alchemy/aa-core';
import { sepolia } from 'viem/chains';
import { Lambda } from 'aws-sdk';
import { ethers } from 'ethers';
import { AlchemyProvider } from '@alchemy/aa-alchemy';

import {
  getSigningLambdaARN,
  getChainName,
  getChainID,
  getMumbaiAPIKey,
  getTestnetAPIKey,
  getEntryPointAddress,
  getWalletFactoryAddress,
  getMumbaiAlchemyPolicyID,
  getTestnetAlchemyPolicyID
} from '../utils/parameters';
import logger from '../utils/logger';

async function callSigningFunction(payload: Buffer): Promise<string> {
  const lambda = new Lambda();

  const params = {
    FunctionName: await getSigningLambdaARN(),
    InvocationType: 'RequestResponse',
    LogType: 'None',
    Payload: payload
  };

  const response = await lambda.invoke(params).promise();

  logger.debug(`signing response is ${JSON.stringify(response)}`);

  if (response.StatusCode !== 200) {
    throw new Error('Failed to get response from signing Lambda function');
  }

  if (!response.Payload) {
    throw new Error('Failed to get signature from signing Lambda function');
  }
  logger.debug(`response.Payload is ${response.Payload.toString('utf8')}`);

  const payloadString = response.Payload.toString('utf8');
  const payloadJSON = JSON.parse(payloadString);
  const userOpSignature = payloadJSON.userop_hash_signature;

  logger.debug(`userOpSignature is ${userOpSignature}`);

  return userOpSignature;
}

class SimpleKMSAccountOwner implements SimpleSmartAccountOwner {
  private key_id: string;
  private sub: string;
  private wallet_address: string;

  constructor(_key_id: string, _sub: string, _wallet_address: string) {
    this.key_id = _key_id;
    this.sub = _sub;
    this.wallet_address = _wallet_address;
  }

  async signMessage(msg: Uint8Array | string): Promise<Address> {
    logger.debug(`msg to sign is ${msg}`);

    const arrayedHash: Uint8Array = ethers.utils.arrayify(msg);
    const eip191hash = ethers.utils.hashMessage(arrayedHash);

    const signerPayload = {
      operation: 'sign_userop',
      // "userop_hash": ethers.utils.hashMessage(msg),
      userop_hash: eip191hash,
      key_id: this.key_id,
      sub: this.sub
    };
    const signedPayload = await callSigningFunction(Buffer.from(JSON.stringify(signerPayload)));
    logger.debug(`signed payload is ${signedPayload}`);
    return signedPayload as Address;
  }

  async getAddress(): Promise<Address> {
    return this.wallet_address as Address;
  }
}

export async function getUserOperationReceipt(hash: Address): Promise<UserOperationReceipt> {
  logger.debug(`starting get user op receipt for hash ${hash}`);

  const APIKEY = getTestnetAPIKey();
  const entryPointAddress = getEntryPointAddress();
  const chainId = Number(getChainID());
  const provider = new AlchemyProvider({
    apiKey: APIKEY,
    entryPointAddress,
    chain: chainId
  });

  const data = await provider.getUserOperationReceipt(hash);
  return data;
}

export async function getTransactionHashForUserOpHash(hash: Address): Promise<string> {
  logger.debug(`starting get transaction hash for user op hash ${hash}`);

  const response = await getUserOperationReceipt(hash);

  return response?.receipt?.transactionHash || null;
}

export async function sendUserOperation(
  signingAddress: string,
  targetAddress: string,
  encodedFunctionData: string,
  userKeyID: string,
  sub: string
): Promise<string> {
  const chainName = getChainName(); //TODO: fix this so we can get the right chain based on chainID and support multiple chains

  logger.debug(
    `starting send user op for userkeyid ${userKeyID} and sub ${sub} and owneraddress ${signingAddress}`
  );
  const owner = new SimpleKMSAccountOwner(userKeyID, sub, signingAddress);

  let APIKEY;
  let policyId;

  const chain = sepolia; //TODO: fix this so we can support multiple chains. Should be part of the getChainName() function.

  // do we nned this since we are getting the chainId using eth_chainId and instructing the user to create the proper API KEY on the Configuration Layer?
  APIKEY = getTestnetAPIKey(); //this is already defined above, no need to redefined it
  policyId = getTestnetAlchemyPolicyID();

  const entryPointAddress = getEntryPointAddress();
  const factoryAddress = getWalletFactoryAddress();

  // 2. initialize the provider and connect it to the account
  // TODO: this instrically couples the workshop to use Alchemy - is this the expected behavior?
  let provider = new AlchemyProvider({
    apiKey: APIKEY,
    entryPointAddress,
    chain
  }).connect(
    (rpcClient) =>
      new SimpleSmartContractAccount({
        entryPointAddress,
        chain,
        factoryAddress,
        rpcClient,
        owner
      })
  );

  provider = provider.withAlchemyGasManager({
    provider: provider.rpcClient,
    policyId: policyId,
    entryPoint: entryPointAddress
  });

  logger.debug('provider.sending the user op');

  // 3. send a UserOperation
  const { hash } = await provider.sendUserOperation({
    target: targetAddress as Address,
    data: encodedFunctionData as Address,
    // data: `0x` as Address,
    value: 0n
  });

  logger.debug(`Result hash of sendingUserOperation ${hash}`);
  return hash;
}
