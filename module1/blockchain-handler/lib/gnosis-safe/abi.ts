// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { ethers } from 'ethers';
import logger from '../utils/logger';
import { getProvider } from '../utils/ethers';

// https://github.com/safe-global/safe-contracts/blob/main/contracts/libraries/CreateCall.sol
const SAFE_CONTRACT_DEPLOYER_ADDRESS = '0x9b35Af71d77eaf8d7e40252370304687390A1A52';

const abiSafeContract: Array<string> = [
  'function performCreate(uint256 value, bytes memory deploymentData) public returns (address newContract)',
  'function performCreate2(uint256 value, bytes memory deploymentData, bytes32 salt) public returns (address newContract)'
];

/*
    Get the NFT contract with the functions needed defined in the abi array, with a provider
*/
export function getSafeContractWithProvider(): ethers.Contract {
  logger.debug('In getSafeContractWithProvider');
  const provider = getProvider();
  return new ethers.Contract(SAFE_CONTRACT_DEPLOYER_ADDRESS, abiSafeContract, provider);
}

/*
    Get the NFT contract with the functions needed defined in the abi array
*/
export async function getSafeContract(): Promise<ethers.Contract> {
  logger.debug('In getSafeContract');
  return new ethers.Contract(
    SAFE_CONTRACT_DEPLOYER_ADDRESS,
    abiSafeContract,
    new ethers.VoidSigner('')
  );
}
