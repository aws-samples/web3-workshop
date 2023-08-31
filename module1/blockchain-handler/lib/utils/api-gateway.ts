// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { APIGatewayProxyEvent } from 'aws-lambda';
import logger from './logger';
import { BlockchainHandlerEvent, ERC721EventParameters, GenericObject } from '../types';

export function isHTTPEvent(
  event: BlockchainHandlerEvent | APIGatewayProxyEvent
): event is APIGatewayProxyEvent {
  return (event as APIGatewayProxyEvent).pathParameters !== undefined;
}

// https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
export function convertHTTPEventToBlockchainHandlerEvent(
  event: APIGatewayProxyEvent
): BlockchainHandlerEvent {
  // Extract details from APIGW Proxy event

  const { requestContext, pathParameters, queryStringParameters } = event;

  let userKeyId: string, ownerAddress: string, sub: string;
  let invocationFunction: string | undefined;
  let metadataURI: string | undefined;
  let toAddress: string | undefined;
  let walletAddress: string | undefined;
  let queryType: ERC721EventParameters['queryType'];
  let queryPageNumber = 1;

  if (requestContext.authorizer?.claims) {
    const { authorizer } = requestContext;
    const { claims } = authorizer;

    logger.debug(`Handling an event.requestContext ${JSON.stringify(requestContext)}`);
    logger.debug(`Authorizer is ${JSON.stringify(requestContext.authorizer)}`);
    logger.debug(`Authorizer claims are ${JSON.stringify(claims)}`);

    // other attributes available within the JWT:
    // account_address: "abc123", backend: "kms"

    userKeyId = claims.key_id;

    logger.debug(`userKeyId is ${userKeyId}`);

    ownerAddress = claims.public_address;

    logger.debug(`ownerAddress is ${ownerAddress}`);

    walletAddress = claims.account_address;

    logger.debug(`walletAddress is ${walletAddress}`);

    sub = claims.sub;

    logger.debug(`sub is ${sub}`);
  } else {
    throw new Error('HTTP request must include authorizer claims');
  }

  // Get path parameters
  const nftCollectionName = pathParameters?.collection || '';
  const tokenId = pathParameters?.tokenId;
  const userOpHash = pathParameters?.userOpHash;

  if (userOpHash) {
    invocationFunction = 'getTransactionHashForUserOpHash';
  } else if (event.resource == '/tokens/genai/{tokenId}' && requestContext.httpMethod == 'POST') {
    invocationFunction = 'convertSentenceToGenAi';
  } else if (!nftCollectionName) {
    throw new Error('Must specify an NFT collection');
  }

  // Get query string
  const queryWalletAddress = queryStringParameters?.owner;
  const queryStringPageNumber = queryStringParameters?.page;

  // Get page number from query string

  if (queryStringPageNumber) {
    queryPageNumber = +queryStringPageNumber;
  }

  // Derive NFT action from request method if not already defined

  if (!invocationFunction) {
    if (event.requestContext.httpMethod == 'POST') {
      invocationFunction = 'mint';
    } else if (event.requestContext.httpMethod == 'PATCH') {
      invocationFunction = 'transfer';
    } else if (event.requestContext.httpMethod == 'DELETE') {
      invocationFunction = 'burn';
    } else {
      invocationFunction = 'query';

      if (tokenId) {
        queryType = 'queryGetDetail';
      } else if (queryWalletAddress) {
        queryType = 'queryGetAllForWallet';
      } else {
        queryType = 'queryGetAll';
      }
    }
  }

  // Get request body
  if (event.body) {
    let jsonBody: GenericObject = {};

    try {
      jsonBody = JSON.parse(event.body);
    } catch (error) {
      throw new Error('Request body must be valid JSON');
    }

    // Get address to transfer token to
    // Sent in request body of PATCH request to transfer.
    toAddress = jsonBody.toAddress;

    /* Get token metadata URI */

    if (nftCollectionName.includes('sentence')) {
      // Sentence NFTs require base64 encoded JSON data URL
      const sentencePrompt = jsonBody.prompt;

      if (invocationFunction == 'mint' && !sentencePrompt) {
        throw new Error("Request body must have 'prompt' property");
      }

      metadataURI = sentencePrompt;
    } else {
      // GenAI NFTs should included metadata URI as-is
      metadataURI = jsonBody.metadataURI;
    }
  }

  return {
    ownerAddress,
    toAddress,
    walletAddress,
    metadataURI,
    nftCollectionName,
    invocationFunction,
    contractType: 'ERC721',
    userKeyId,
    sub,
    queryType,
    queryWalletAddress,
    queryPageNumber,
    tokenId,
    userOpHash
  };
}
