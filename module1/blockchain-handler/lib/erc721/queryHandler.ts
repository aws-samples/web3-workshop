// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { BigNumber, ethers } from 'ethers';
import { getNFTContractWithProvider } from './abi';
import { Nft, GraphResponse, NftQueryResult, GraphToken, SentenceNftMetdata } from '../types';
import { ThirdwebStorage } from '@thirdweb-dev/storage';
import request, { gql } from 'graphql-request';
import logger from '../utils/logger';

const twStorage = new ThirdwebStorage();

function parseSentenceNftMetadata(
  nftContractAddress: string,
  tokenId: string,
  tokenMetadata: SentenceNftMetdata
) {
  let sentence = '';

  const sentenceAttribute = tokenMetadata.attributes.find(
    ({ trait_type }) => trait_type == 'sentence'
  );

  if (sentenceAttribute) {
    sentence = sentenceAttribute.value;
  } else {
    logger.warn(
      `No sentence metadata found for ${tokenId} from contract ${nftContractAddress}. Metadata found: ${JSON.stringify(
        tokenMetadata,
        null,
        2
      )}`
    );
  }

  return sentence;
}

/*
    Gets a token URI and its corresponding data
    Supported token URIs: ipfs:// and data:
    Returns an NFT object
*/
async function getNft(
  nftContract: ethers.Contract,
  nftCollectionId: string,
  tokenId: BigNumber
): Promise<Nft> {
  logger.debug(`Fetching NFT ${tokenId} from contract ${nftContract.address}...`);

  const [tokenUri, tokenOwner]: [string, string] = await Promise.all([
    nftContract.tokenURI(tokenId),
    nftContract.ownerOf(tokenId)
  ]);
  let description, imageUrl;

  description = imageUrl = '';

  if (tokenUri.startsWith('ipfs://')) {
    const ipfsMetadata = await twStorage.downloadJSON(tokenUri);

    description = ipfsMetadata.name || ipfsMetadata.description;
    imageUrl = ipfsMetadata.image;
  } else if (tokenUri.startsWith('data:')) {
    // Extract the token metadata JSON from the base64 encoded JSON data URL stored in the contract

    const base64Data = tokenUri.substring(tokenUri.indexOf(',') + 1);
    const tokenMetadataString = Buffer.from(base64Data, 'base64').toString('utf-8');
    const tokenMetadata: SentenceNftMetdata = JSON.parse(tokenMetadataString);

    description = parseSentenceNftMetadata(nftContract.address, tokenId.toString(), tokenMetadata);
  } else {
    logger.warn('Unsupported tokenUri:', tokenUri);
  }

  const nft: Nft = {
    contractAddress: nftContract.address,
    collectionId: nftCollectionId,
    id: tokenId.toString(),
    owner: tokenOwner,
    imageUrl,
    description
  };

  return nft;
}

/*
    Queries the smart contract for a token given a token index
    Returns an NFT at corresponding token indx
*/
async function queryContractToken(
  nftContract: ethers.Contract,
  nftCollectionId: string,
  tokenIndex: number
): Promise<Nft> {
  const tokenId: BigNumber = await nftContract.tokenByIndex(tokenIndex);

  return await getNft(nftContract, nftCollectionId, tokenId);
}

/*
    Queries the smart contract for a token given an owner's token index
    Returns NFTs owned by the address
*/
async function queryOwnerToken(
  nftContract: ethers.Contract,
  nftCollectionId: string,
  ownerAddress: string,
  ownerTokenIndex: number
): Promise<Nft> {
  const tokenId: BigNumber = await nftContract.tokenOfOwnerByIndex(ownerAddress, ownerTokenIndex);

  return await getNft(nftContract, nftCollectionId, tokenId);
}

/*
    Queries for a page of NFTs from a contract
    Returns NFTs minted by the contract on the specifed page
*/
export async function queryNftsForPage(
  nftContract: ethers.Contract,
  nftCollectionId: string,
  pageNumber = 1,
  pageSize = 5
): Promise<Nft[]> {
  const totalTokens = await nftContract.totalSupply();
  const startIndex = (pageNumber - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize - 1, totalTokens - 1);

  const tokenUriPromises: Promise<Nft>[] = [];

  for (let i = startIndex; i <= endIndex; i++) {
    tokenUriPromises.push(queryContractToken(nftContract, nftCollectionId, i));
  }

  return await Promise.all(tokenUriPromises);
}

/*
    Queries the smart contract directly. It looks at what parameters were passed in to determine the method to call
    Returns the requested data
*/
export async function queryGraphForNFT(
  indexerEndpoint: string,
  queryType: 'queryGetAll' | 'queryGetAllForWallet' | 'queryGetDetail',
  nftCollectionAddress: string,
  nftCollectionId: string,
  walletAddress?: string,
  tokenId?: string,
  pageNumber = 1,
  pageSize = 5
): Promise<NftQueryResult> {
  logger.debug('=== Starting queryGraphForNFT ===');
  logger.debug(`Querying from contract ${nftCollectionAddress}...`);
  logger.debug('Indexer available at: ' + indexerEndpoint);
  if (indexerEndpoint == 'none') {
    throw new Error('Must have indexer available');
  }

  const indexerUrl = `${indexerEndpoint}/subgraphs/name/${nftCollectionId}`;

  if (queryType == 'queryGetAllForWallet') {
    logger.debug(`Querying for tokens owned by address ${walletAddress}...`);

    const accountQuery = gql`
      query getAccount($account: String!) {
        account(id: $account) {
          id
          tokens {
            tokenId
            owner {
              id
            }
            contract {
              id
            }
            updatedAtTimestamp
            ipfsUri {
              name
              image
              description
            }
            previousOwners {
              id
            }
          }
        }
      }
    `;

    if (!walletAddress) {
      throw new Error('Wallet address is required');
    }
    const response: GraphResponse = await request(indexerUrl, accountQuery, {
      account: walletAddress
    });
    if (response.account && response.account.tokens && response.account.tokens.length > 0) {
      const { tokens } = response.account;

      const nfts: Nft[] = tokens.map((token) => parseGraphTokenResponse(token, nftCollectionId));

      return { nfts };
    }

    return { nfts: [] };
  } else if (queryType == 'queryGetDetail') {
    logger.debug(`Querying token ${tokenId}...`);

    if (!tokenId) {
      throw new Error('Token ID is required');
    }

    const tokenQuery = gql`
      query getToken($tokenId: String!) {
        tokens(where: { tokenId: $tokenId }) {
          tokenId
          updatedAtTimestamp
          owner {
            id
          }
          contract {
            id
          }
          ipfsUri {
            name
            image
            description
          }
          previousOwners {
            id
          }
        }
      }
    `;

    const response: GraphResponse = await request(indexerUrl, tokenQuery, { tokenId: tokenId });

    if (!response.tokens) {
      throw new Error('No tokens returned from indexer');
    }

    if (response.tokens && response.tokens.length > 0) {
      const token = response.tokens[0];

      logger.debug('Token found: ' + JSON.stringify(token));

      const nft: Nft = parseGraphTokenResponse(token, nftCollectionId);

      return { nfts: [nft] };
    }
  }

  logger.debug('Querying all...');

  const startIndex = (pageNumber - 1) * pageSize;

  const allQuery = gql`
    query getTokens($skip: Int!, $first: Int!) {
      tokens(skip: $skip, first: $first) {
        tokenId
        updatedAtTimestamp
        owner {
          id
        }
        contract {
          id
        }
        ipfsUri {
          name
          image
          description
        }
        previousOwners {
          id
        }
      }
    }
  `;

  const response: GraphResponse = await request(indexerUrl, allQuery, {
    skip: startIndex,
    first: pageSize
  });

  if (!response.tokens) {
    throw new Error('No tokens returned from indexer');
  }

  if (response.tokens && response.tokens.length > 0) {
    const { tokens } = response;

    const nfts: Nft[] = tokens.map((token) => parseGraphTokenResponse(token, nftCollectionId));

    return {
      nfts,
      nextPage: ++pageNumber
    };
  }

  const emptyNfts: Nft[] = [];

  return { nfts: emptyNfts };
}

// function graphTokenMetadataToSentenceTokenMetadata({
//   name,
//   description,
//   image,
//   attributes
// }: GraphToken['metadata']): SentenceNftMetdata {
//   return {
//     name,
//     description,
//     image,
//     attributes: attributes.map(({ key, value }) => ({ trait_type: key, value }))
//   };
// }

function parseGraphTokenResponse(token: GraphToken, nftCollectionId: string): Nft {
  return {
    contractAddress: token.contract.id,
    collectionId: nftCollectionId,
    owner: token.owner.id,
    id: token.tokenId,
    imageUrl: token.ipfsUri.image,
    description:
      token.ipfsUri.name ||
      token.ipfsUri.description,
      // ||
      // parseSentenceNftMetadata(
      //   token.contract.id,
      //   token.tokenId,
      //   graphTokenMetadataToSentenceTokenMetadata(token.metadata)
      // ),
  };
}

/*
    Queries the smart contract directly. It looks at what parameters were passed in to determine the method to call
    Returns the requested data
*/
export async function queryNFT(
  queryType: 'queryGetAll' | 'queryGetAllForWallet' | 'queryGetDetail',
  nftCollectionAddress: string,
  nftCollectionId: string,
  walletAddress?: string,
  tokenId?: string,
  pageNumber = 1
): Promise<NftQueryResult> {
  logger.debug('=== Starting queryNFT ===');
  logger.debug(`Querying from contract ${nftCollectionAddress}...`);

  const nftContract: ethers.Contract = getNFTContractWithProvider(nftCollectionAddress);

  if (queryType == 'queryGetAllForWallet') {
    logger.debug(`Querying for tokens owned by address ${walletAddress}...`);

    if (!walletAddress) {
      throw new Error('Wallet address is required');
    }

    // Get the balance of the requested wallet address

    const walletBalance = await nftContract.balanceOf(walletAddress);

    // Get each token the wallet owns

    const getNftPromises: Promise<Nft>[] = [];

    for (let i = 0; i < walletBalance; i++) {
      getNftPromises.push(queryOwnerToken(nftContract, nftCollectionId, walletAddress, i));
    }

    const nfts = await Promise.all(getNftPromises);

    return { nfts };
  } else if (queryType == 'queryGetDetail') {
    logger.debug(`Querying token ${tokenId}...`);

    if (!tokenId) {
      throw new Error('Token ID is required');
    }

    const nft = await getNft(nftContract, nftCollectionId, BigNumber.from(tokenId));

    return { nfts: [nft] };
  }

  logger.debug('Querying all...');

  const nfts = await queryNftsForPage(nftContract, nftCollectionId, pageNumber);

  return {
    nfts,
    nextPage: ++pageNumber
  };
}
