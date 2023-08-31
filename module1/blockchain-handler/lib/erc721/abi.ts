// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { ethers } from 'ethers';
import { getProvider } from '../utils/ethers';

const abiNFTContract: Array<string> = [
  'function mint(address to, string memory uri) public returns (uint256)',
  'function balanceOf(address owner) public view returns (uint256)',
  'function burn(uint256 tokenId) public',
  'function setMaxPerAddress(uint256 newMax) external',
  'function safeTransferFrom(address from, address to, uint256 tokenId) external',
  'function tokenURI(uint256 tokenId) public view returns (string)',
  'function totalSupply() public view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256)',
  'function tokenByIndex(uint256 index) public view returns (uint256)',
  'function ownerOf(uint256 index) public view returns (address)'
];

/*
    Get the NFT contract with the functions needed defined in the abi array, with a provider
*/
export function getNFTContractWithProvider(nftCollectionAddress: string): ethers.Contract {
  const provider = getProvider();

  return new ethers.Contract(nftCollectionAddress, abiNFTContract, provider);
}

/*
    Get the NFT contract with the functions needed defined in the abi array
*/
export async function getNFTContract(nftCollectionAddress: string): Promise<ethers.Contract> {
  return new ethers.Contract(nftCollectionAddress, abiNFTContract, new ethers.VoidSigner(''));
}
