// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { providers } from 'ethers';

export function getProvider(): providers.JsonRpcProvider {
  const url = process.env.RPC_ENDPOINT;

  return new providers.JsonRpcProvider(url);
}
