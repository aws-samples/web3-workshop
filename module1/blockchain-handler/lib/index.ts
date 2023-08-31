// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Handler } from 'aws-cdk-lib/aws-lambda';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { getTransactionHashForUserOpHash } from './account-abstraction/handler';
import { handleEvent as erc721Handler } from './erc721/contract';
import {
  ERC721EventParameters,
  BlockchainHandlerEvent,
  BlockchainHandlerResult,
  LambdaResponse
} from './types';
import { isHTTPEvent, convertHTTPEventToBlockchainHandlerEvent } from './utils/api-gateway';
import { respond, respondToError } from './utils/lambda';
import logger from './utils/logger';
import { Address } from 'viem';
import { convertSentenceToGenAi } from './amb-query/handler';

async function handleBlockchainEvent(
  event: BlockchainHandlerEvent
): Promise<BlockchainHandlerResult> {
  let result: BlockchainHandlerResult;

  if (event.invocationFunction == 'getTransactionHashForUserOpHash') {
    result = await getTransactionHashForUserOpHash(event.userOpHash as Address);
  } else if (event.invocationFunction == 'convertSentenceToGenAi') {
    result = await convertSentenceToGenAi(event.tokenId || '');
  } else if (
    event.contractType == 'ERC721' ||
    event.invocationFunction == 'updateNFTContractAddress'
  ) {
    result = await erc721Handler(event as ERC721EventParameters);
  } else {
    throw new Error(
      `Unrecognized contractType ${event.contractType} and invocation function ${event.invocationFunction}`
    );
  }
  return result;
}

// The handler processes HTTP requests from an APIGateway, and non-HTTP requests
export const handler: Handler = async (event: BlockchainHandlerEvent | APIGatewayProxyEvent) => {
  logger.debug('==== Starting Blockchain handler ====');
  logger.debug(`Handling event ${JSON.stringify(event)}`);

  let response: LambdaResponse, result: BlockchainHandlerResult;
  try {
    if (isHTTPEvent(event)) {
      const handlerEvent = convertHTTPEventToBlockchainHandlerEvent(event);
      result = await handleBlockchainEvent(handlerEvent);
    } else {
      result = await handleBlockchainEvent(event);
    }

    response = respond({ body: result });
  } catch (err) {
    logger.error(`Caught error in Blockchain handler: ${err}`);

    const error = err as { statusCode: number; message: string };

    response = respondToError({ error });
  }
  return response;
};
