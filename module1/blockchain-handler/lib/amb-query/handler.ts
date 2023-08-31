// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import logger from '../utils/logger';

export async function convertSentenceToGenAi(tokenId: string) {
  if (tokenId) {
    logger.debug(`Converting token ${tokenId} Sentence to Gen AI...`);

    /* TODO
     *  Fetch ChainQuery Token from Sentence contract
     *  Get metadata URI
     *  Extract sentence
     *  Mint GenAI NFT
     *  Return user op hash
     */

    const userOpHash = '';

    return userOpHash;
  }

  throw new Error('Token ID is required');
}
