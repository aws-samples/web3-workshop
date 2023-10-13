// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
export type GenericObject = {
  [key: string]: any;
};

export type ERC721EventParameters = {
  ownerAddress: string;
  invocationFunction: string;
  nftCollectionName: string;
  tokenId?: string;
  toAddress?: string;
  walletAddress?: string;
  metadataURI?: string;
  s3ObjectKey?: string;
  userKeyId?: string;
  sub?: string;
  userOpHash?: string;
  queryType?: 'queryGetAll' | 'queryGetAllForWallet' | 'queryGetDetail';
  queryWalletAddress?: string;
  queryPageNumber?: number;
};

export interface BlockchainHandlerEvent extends ERC721EventParameters {
  contractType: string;
}

export type NftQueryResult = {
  nfts: Nft[];
  nextPage?: number;
};

export type BlockchainHandlerResult = string | NftQueryResult;

export type Nft = {
  contractAddress: string;
  collectionId: string;
  id: string;
  owner: string;
  imageUrl: string;
  description: string;
  mintTransactionHash?: string;
  timeMinted?: number;
};

export type GraphResponse = {
  tokens?: GraphToken[];
  account?: GraphAccount;
};

export type GraphAccount = {
  id: string;
  tokens: GraphToken[];
};

export type GraphToken = {
  tokenId: string;
  contract: { id: string };
  updatedAtTimestamp: string;
  owner: { id: string };
  ipfsUri: {
    name: string;
    image: string;
    description: string;
  };
  previousOwners: { id: string }[];
};

export type LambdaResponse = {
  isBase64Encoded: boolean;
  statusCode: number;
  headers: GenericObject;
  body: string;
};

export type SentenceNftMetdata = {
  name: string;
  description?: string;
  image?: string;
  attributes: {
    trait_type: string;
    value: string;
  }[];
};
