import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { AINFTMinted } from "../generated/schema"
import { AINFTMinted as AINFTMintedEvent } from "../generated/GenerativeAINFT/GenerativeAINFT"
import { handleAINFTMinted } from "../src/generative-ainft"
import { createAINFTMintedEvent } from "./generative-ainft-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let _from = Address.fromString("0x0000000000000000000000000000000000000001")
    let _to = Address.fromString("0x0000000000000000000000000000000000000001")
    let _tokenId = BigInt.fromI32(234)
    let _metadataURI = "Example string value"
    let newAINFTMintedEvent = createAINFTMintedEvent(
      _from,
      _to,
      _tokenId,
      _metadataURI
    )
    handleAINFTMinted(newAINFTMintedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("AINFTMinted created and stored", () => {
    assert.entityCount("AINFTMinted", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "AINFTMinted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "_from",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "AINFTMinted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "_to",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "AINFTMinted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "_tokenId",
      "234"
    )
    assert.fieldEquals(
      "AINFTMinted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "_metadataURI",
      "Example string value"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
