// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { ethers } from 'ethers';
import { encodeDeployData } from 'viem';
import { Address } from 'abitype';
import * as unzipper from 'unzipper';
import { getNFTContract } from './abi';
import { getSafeContract } from '../gnosis-safe/abi';
import { sendUserOperation, getUserOperationReceipt } from '../account-abstraction/handler';
import * as AWS from 'aws-sdk';
import { queryNFT, queryGraphForNFT } from './queryHandler';
import { BlockchainHandlerResult, ERC721EventParameters } from '../types';
import { getS3AssetBucketARN, getSSMParameter, putSSMParameter } from '../utils/parameters';
import logger from '../utils/logger';

// The contract deployment event that is used to locate a deployed contract address
const CONTRACT_CREATION_EVENT_TOPIC =
  '0x4db17dd5e4732fb6da34a148104a592783ca119a1e7bb8829eba6cbadef0b511';
const SENTENCE_NFT_PIPELINE_ARTIFACT_FOLDER = 'Web3WorkshopNFTPipel/';
const GENAI_NFT_PIPELINE_ARTIFACT_FOLDER = 'Web3WorkshopGenAINFT/';
const SSM_KEY_CONTRACT_BASE = '/web3/contracts/erc721/';

const s3: AWS.S3 = new AWS.S3({ region: process.env.AWS_REGION });

async function getContractABI(contractName: string): Promise<any> {
  logger.debug(`In getContractABI for ${contractName}`);
  let contractKey, contractFolder;

  if (contractName == 'sentences') {
    contractFolder = SENTENCE_NFT_PIPELINE_ARTIFACT_FOLDER;
    contractKey = 'sentNFTABI';
  } else if (contractName == 'genai') {
    contractFolder = GENAI_NFT_PIPELINE_ARTIFACT_FOLDER;
    contractKey = 'genAIABI';
  } else {
    throw new Error(`Unknown contract name: ${contractName}`);
  }

  const assetBucketARN = await getS3AssetBucketARN();
  const bucketName = assetBucketARN.substring(13); // remove leading `arn:aws:s3:::`
  const prefix = contractFolder + contractKey;

  logger.debug(`Asset bucket ARN is ${assetBucketARN} and prefix is ${prefix}`);
  const objects = await s3.listObjectsV2({ Bucket: bucketName, Prefix: prefix }).promise();
  if (!objects || !objects.Contents || objects.Contents.length == 0) {
    throw new Error(`No contract found for ${contractName}`);
  }
  logger.debug(`Found ${objects.Contents.length} objects in bucket`);

  // Sort so that most recent object is first in array
  objects.Contents.sort((a, b) => {
    return Number(b.LastModified) - Number(a.LastModified);
  });

  const content = await getS3ArchiveContent(objects.Contents[0].Key as string);
  return content;
}

// Reads and unzips an archive file at the given s3ObjectKey. This function assumes
// the archive contains a single file.
// Returns the stringified contents of the file.
async function getS3ArchiveContent(s3ObjectKey: string): Promise<string | undefined> {
  logger.debug(`In getS3ArchiveContent for ${s3ObjectKey}`);
  const assetBucketARN = await getS3AssetBucketARN();
  const bucketName = assetBucketARN.substring(13); // remove leading `arn:aws:s3:::`

  const promise = new Promise((resolve, reject) => {
    try {
      s3.getObject({ Bucket: bucketName, Key: s3ObjectKey })
        .createReadStream()
        .pipe(unzipper.Parse())
        .on('entry', (entry: any) => {
          logger.debug('Got entry');
          resolve(entry);
        })
        .on('error', (err: unknown) => {
          logger.debug('Caught error parsing read stream');
          reject(err);
        });
    } catch (err) {
      logger.error(`Caught error in promise ${JSON.stringify(err)}`);
      throw err;
    }
  });

  return promise.then(async (entry: any) => {
    const result = await entry.buffer();
    return result.toString('utf-8');
  });
}

function getNFTUserOpHashSSMKey(nftCollectionName: string): string {
  return SSM_KEY_CONTRACT_BASE + nftCollectionName + '/userophash';
}

function getNFTAddressSSMKey(nftCollectionName: string): string {
  return SSM_KEY_CONTRACT_BASE + nftCollectionName + '/address';
}

async function getNFTCollectionAddress(nftCollectionName: string): Promise<string> {
  const contractKey = getNFTAddressSSMKey(nftCollectionName);
  const contractAddress = await getSSMParameter(contractKey);

  return contractAddress;
}

/*
    This function encodes the `burn` function call on the NFT contract and sends it to the bundler.
    The address it sends is the user's Account Abstraction wallet.
    Returns the UserOperation hash.
*/
async function burnNFT(
  nftCollectionAddress: string,
  ownerAddress: string,
  tokenId: string,
  userKeyID: string,
  sub: string
): Promise<string> {
  logger.debug(`=== Starting burnNFT for token ${tokenId} ===`);
  const nftContract: ethers.Contract = await getNFTContract(nftCollectionAddress);
  const encodedFunctionData = nftContract.interface.encodeFunctionData('burn', [tokenId]);

  return sendUserOperation(ownerAddress, nftContract.address, encodedFunctionData, userKeyID, sub);
}

/*
    This function encodes the `safeTransferFrom` function call on the NFT contract and sends it to the bundler.
    The address it sends is the user's Account Abstraction wallet.
    Returns the UserOperation hash.
*/
async function transferNFT(
  nftCollectionAddress: string,
  ownerAddress: string,
  toAddress: string,
  walletAddress: string,
  tokenId: string,
  userKeyID: string,
  sub: string
): Promise<string> {
  logger.debug('=== Starting transferNFT ===');
  const nftContract: ethers.Contract = await getNFTContract(nftCollectionAddress);
  const encodedFunctionData = nftContract.interface.encodeFunctionData('safeTransferFrom', [
    walletAddress,
    toAddress,
    tokenId
  ]);

  return sendUserOperation(ownerAddress, nftContract.address, encodedFunctionData, userKeyID, sub);
}

/*
    Mints an NFT for the smart contract wallet address associated with the passed in userAddress.
    Returns the blockchain transaction hash
*/
async function mintNFT(
  nftCollectionAddress: string,
  ownerAddress: string,
  toAddress: string,
  metadataURI: string,
  userKeyID: string,
  sub: string
): Promise<string> {
  logger.debug('=== Starting mintNFT ===');
  const nftContract: ethers.Contract = await getNFTContract(nftCollectionAddress);
  const encodedFunctionData = nftContract.interface.encodeFunctionData('mint', [
    toAddress,
    metadataURI
  ]);

  return sendUserOperation(ownerAddress, nftContract.address, encodedFunctionData, userKeyID, sub);
}

/*
    Deploys the smart contract at the passed in S3 URL with an owner of the passed in `ownerAddress`.
    Returns the blockchain transaction hash.

    This function assumes the `ownerAddress` is always passed in as the only constructor argument. This is to enable deploying contracts that require setting the owner to the Account Abstraction wallet deploying it
*/
async function deployContract(
  ownerAddress: string,
  nftCollectionName: string,
  userKeyID: string,
  sub: string
): Promise<string> {
  logger.debug('=== Starting deployContract ===');

  const safeContract: ethers.Contract = await getSafeContract();

  const compiledContract = await getContractABI(nftCollectionName);

  if (!compiledContract) {
    throw new Error(`Could not find contract for collection ${nftCollectionName}`);
  }

  logger.debug('Got compiledContract');

  const contractJSON = JSON.parse(compiledContract);

  const deploymentData = encodeDeployData({
    args: [ownerAddress],
    bytecode: contractJSON.bytecode.object as Address,
    abi: contractJSON.abi
  });

  const encodedFunctionData = safeContract.interface.encodeFunctionData('performCreate', [
    0, // value in wei to send to constructor
    deploymentData
  ]);

  const userOpHash = await sendUserOperation(
    ownerAddress,
    safeContract.address,
    encodedFunctionData,
    userKeyID,
    sub
  );

  await putSSMParameter(getNFTUserOpHashSSMKey(nftCollectionName), userOpHash);

  return userOpHash;
}

async function updateNFTContractAddress(nftCollectionName: string): Promise<string> {
  const userOpHash = await getSSMParameter(getNFTUserOpHashSSMKey(nftCollectionName));
  logger.debug(`Got userOpHash ${userOpHash}`);
  if (!userOpHash) {
    throw new Error(`Could not find UserOperation hash for collection ${nftCollectionName}`);
  }
  const receipt = await getUserOperationReceipt(userOpHash as Address);
  logger.debug(`Got receipt ${JSON.stringify(receipt)}`);
  if (!receipt) {
    logger.error(`Could not find UserOperation receipt for UserOperation hash ${userOpHash}`);
    return '';
  }

  let contractAddress;
  receipt.logs.forEach((log: any) => {
    if (log.topics[0] == CONTRACT_CREATION_EVENT_TOPIC) {
      logger.debug(`log is ${JSON.stringify(log)}`);
      const contractAddressPadded = log.topics[1];
      contractAddress = '0x' + contractAddressPadded.slice(26);
    }
  });
  if (!contractAddress) {
    throw new Error(`UserOpHash ${userOpHash} does not contain a contract creation event`);
  }
  logger.debug(`Got contractAddress ${contractAddress}`);
  await putSSMParameter(getNFTAddressSSMKey(nftCollectionName), contractAddress);

  return contractAddress;
}

/**
 * invocationFunction can be one of:
 *  - mint, burn, transfer, deploy, queryGetAll, queryGetAllForWallet, queryGetDetail
 */
export async function handleEvent(event: ERC721EventParameters): Promise<BlockchainHandlerResult> {
  const ownerAddress = event.ownerAddress; // who the transaction is invoked on behalf of
  const toAddress = event.toAddress; // receiver of the transaction, eg who NFT is transferred to
  const walletAddress = event.walletAddress; // account abstraction wallet address
  const nftCollectionName = event.nftCollectionName;
  const invocationFunction = event.invocationFunction;
  const tokenId = event.tokenId;
  const userKeyId = event.userKeyId;
  const metadataURI = event.metadataURI;
  const sub = event.sub;
  const queryType = event.queryType;
  const queryWalletAddress = event.queryWalletAddress;
  const queryPageNumber = event.queryPageNumber;

  let result;

  let nftCollectionAddress = '';

  if (nftCollectionName) {
    try {
      nftCollectionAddress = await getNFTCollectionAddress(nftCollectionName);
    } catch {
      // no op, because we don't want to throw an error if the collection doesn't exist
    }
  }

  if (invocationFunction == 'mint') {
    if (!metadataURI) {
      throw new Error('Must specify a metadataURI');
    }

    if (!ownerAddress) {
      throw new Error('Must specify an owner to mint');
    }

    if (!walletAddress) {
      throw new Error('Must specify a walletAddress to mint');
    }

    if (!userKeyId) {
      throw new Error('Must specify a userKeyId');
    }

    if (!sub) {
      throw new Error('Must specify a sub');
    }

    result = await mintNFT(
      nftCollectionAddress,
      ownerAddress,
      walletAddress,
      metadataURI,
      userKeyId,
      sub
    );
  } else if (invocationFunction == 'burn') {
    if (!tokenId) {
      throw new Error('Must specify a tokenId to burn');
    }

    if (!userKeyId) {
      throw new Error('Must specify a userKeyId');
    }

    if (!sub) {
      throw new Error('Must specify a sub');
    }

    result = await burnNFT(nftCollectionAddress, ownerAddress, tokenId, userKeyId, sub);
  } else if (invocationFunction == 'transfer') {
    if (!tokenId || !toAddress || !walletAddress) {
      throw new Error('Must specify a tokenId, toAddress, and walletAddress to transfer an NFT');
    }

    if (!userKeyId) {
      throw new Error('Must specify a userKeyId');
    }

    if (!sub) {
      throw new Error('Must specify a sub');
    }

    result = await transferNFT(
      nftCollectionAddress,
      ownerAddress,
      toAddress,
      walletAddress,
      tokenId,
      userKeyId,
      sub
    );
  } else if (invocationFunction == 'query') {
    if (!queryType) {
      throw new Error('Must specify a queryType');
    }

    if (!userKeyId) {
      throw new Error('Must specify a userKeyId');
    }

    if (!sub) {
      throw new Error('Must specify a sub');
    }

    // Use The Graph to query if its setup and the Gen AI Collection is being queried

    const indexerAvailable = process.env.INDEXER_ENDPOINT != 'none';
    const useTheGraph = indexerAvailable && nftCollectionName == 'genai';

    if (!useTheGraph) {
      result = await queryNFT(
        queryType,
        nftCollectionAddress,
        nftCollectionName,
        queryWalletAddress,
        tokenId,
        queryPageNumber
      );
    } else {
      // query graph instead
      result = await queryGraphForNFT(
        process.env.INDEXER_ENDPOINT || 'none',
        queryType,
        nftCollectionAddress,
        nftCollectionName,
        queryWalletAddress,
        tokenId,
        queryPageNumber
      );
    }
  } else if (invocationFunction == 'deploy') {
    if (!userKeyId) {
      throw new Error('Must specify a userKeyId');
    }

    if (!sub) {
      throw new Error('Must specify a sub');
    }

    if (!nftCollectionName) {
      throw new Error('Must specify a contract to deploy');
    }

    result = await deployContract(ownerAddress, nftCollectionName, userKeyId, sub);
  } else if (invocationFunction == 'updateNFTContractAddress') {
    if (!nftCollectionName) {
      throw new Error('Must specify a contract');
    }

    result = await updateNFTContractAddress(nftCollectionName);
  } else {
    throw new Error(`${invocationFunction} is not a recognized function`);
  }

  return result;
}
