// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import {
  log,
  json,
  Bytes,
  dataSource,
  ethereum,
  BigInt,
  Address
} from '@graphprotocol/graph-ts'
import {
  GenAINFTMinted as GenAINFTMintedEvent,
  Approval as ApprovalEvent,
  ApprovalForAll as ApprovalForAllEvent,
  GenerativeAINFT,
  MAXNFTsUpdated as MAXNFTsUpdatedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  Paused as PausedEvent,
  Transfer as TransferEvent,
  Unpaused as UnpausedEvent
} from '../generated/GenerativeAINFT/GenerativeAINFT'
import {
  GenAINFTMinted,
  Account,
  Approval,
  ApprovalForAll,
  Contract,
  MAXNFTsUpdated,
  OwnershipTransferred,
  Paused,
  PrevTokenAccount,
  Token,
  Transfer,
  Unpaused
} from '../generated/schema'

import { TokenMetadata as TokenMetadataTemplate } from '../generated/templates'

export function handleGenAINFTMinted(event: GenAINFTMintedEvent): void {
  let entity = new GenAINFTMinted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._from = event.params._from
  entity._to = event.params._to
  entity._tokenId = event.params._tokenId
  entity._metadataURI = event.params._metadataURI

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  let contract = getContract(event.address)
  let owner = getAccount(event.params._to)
  let token = getToken(
    contract,
    owner,
    event.params._tokenId,
    event.block.timestamp
  )

  token.uri = event.params._metadataURI
  token.mintTx = event.transaction.hash

  if (event.params._metadataURI.startsWith('ipfs://')) {
    const ipfsHash = `${event.params._metadataURI.substring(7)}`
    log.info('Adding ipfsHash {}', [ipfsHash])
    token.ipfsUri = ipfsHash
    TokenMetadataTemplate.create(ipfsHash)
  }

  token.save()
}

export function handleApproval(event: ApprovalEvent): void {
  let entity = new Approval(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.approved = event.params.approved
  entity.tokenId = event.params.tokenId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleApprovalForAll(event: ApprovalForAllEvent): void {
  let entity = new ApprovalForAll(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.operator = event.params.operator
  entity.approved = event.params.approved

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleMAXNFTsUpdated(event: MAXNFTsUpdatedEvent): void {
  let entity = new MAXNFTsUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._from = event.params._from
  entity._to = event.params._to

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  let contract = getContract(event.address)
  contract.maxNFTs = event.params._to
  log.info('Updated max NFTs from {} to {}', [
    event.params._from.toString(),
    event.params._to.toString()
  ])
  contract.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePaused(event: PausedEvent): void {
  let entity = new Paused(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.account = event.params.account

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

function getContract(address: Bytes): Contract {
  let contract = Contract.load(address)

  if (!contract) {
    contract = new Contract(address)
    // const onChainContract = GenerativeAINFT.bind(event.address)

    contract.name = 'GenerativeAINFT'
    contract.symbol = 'LNFT'
    contract.maxNFTs = new BigInt(0)
    contract.tokenIds = []

    contract.save()
    log.info("Detected new contract '{}' at {} with Symbol {}", [
      contract.name,
      contract.id.toHex(),
      contract.symbol
    ])
  }

  return contract
}

function getAccount(address: Bytes): Account {
  let account = Account.load(address)

  if (!account) {
    account = new Account(address)
    account.save()
    log.info('Detected new account {}', [account.id.toHex()])
  }
  return account
}

function getToken(
  contract: Contract,
  owner: Account,
  tokenId: BigInt,
  timestamp: BigInt
): Token {
  const id = contract.id.concatI32(tokenId.toI32())
  let token = Token.load(id)

  if (!token) {
    token = new Token(id)
    token.tokenId = tokenId
    token.contract = contract.id
    token.owner = owner.id
    token.updatedAtTimestamp = timestamp
    token.save()

    contract.tokenIds.push(token.tokenId)
    contract.save()
    log.info('Found new token {}/{}', [
      contract.symbol,
      token.tokenId.toString()
    ])
  }

  return token
}

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.from = event.params.from
  entity.to = event.params.to
  entity.tokenId = event.params.tokenId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  // entities
  let contract = getContract(event.address)
  let owner = getAccount(event.params.to)
  let token = getToken(
    contract,
    owner,
    event.params.tokenId,
    event.block.timestamp
  )

  const isNonMint: boolean =
    event.params.from !=
    Address.fromString('0x0000000000000000000000000000000000000000')
  log.info('Transfer event from {} to {}, which is not a mint: {}', [
    event.params.from.toHexString(),
    event.params.to.toHexString(),
    isNonMint.toString()
  ])

  if (
    event.params.from !=
    Address.fromString('0x0000000000000000000000000000000000000000')
  ) {
    // only add non-mint transfers to previous owners
    const prevOwnerId = token.owner.concat(token.id)
    let prevOwner = new PrevTokenAccount(prevOwnerId)
    prevOwner.account = token.owner
    prevOwner.token = token.id
    prevOwner.save()
    log.info('New prev owner {} for token {}', [
      prevOwner.account.toHexString(),
      prevOwner.token.toString()
    ])
  }

  token.owner = owner.id
  token.updatedAtTimestamp = event.block.timestamp
  token.save()
}

export function handleUnpaused(event: UnpausedEvent): void {
  let entity = new Unpaused(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.account = event.params.account

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
