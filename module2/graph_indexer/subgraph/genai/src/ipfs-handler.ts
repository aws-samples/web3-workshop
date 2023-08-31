// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import {
  log,
  json,
  Bytes,
  dataSource,
  JSONValueKind
} from '@graphprotocol/graph-ts'

import { TokenMetadata } from '../generated/schema'

// class Attribute {
//   trait_type: string;
//   value: string;

//   constructor(trait_type: string, value: string) {
//     this.trait_type = trait_type;
//     this.value = value;
//   }

//   toString(): string {
//     return `{ "trait_type": "${this.trait_type}", "value": "${this.value}" }`;
//   }
// }

export function handleTokenMetadata(content: Bytes): void {
  log.info('Query metadata for {}', [dataSource.stringParam()])
  let tokenMetadata = new TokenMetadata(dataSource.stringParam())
  log.info('Content: {}', [content.toString()])
  const val = json.fromBytes(content)
  log.info('Value kind: {}', [val.kind.toString()])
  if (val.kind != JSONValueKind.OBJECT) {
    return
  }

  if (val.kind == JSONValueKind.OBJECT) {
    log.info('Kind: Object', [])
  }
  const value = val.toObject()
  if (value) {
    log.info('There is a value', [])
    const image = value.get('image')
    if (image) {
      log.info('Image: {}', [image.toString()])
    }

    const description = value.get('description')
    if (description) {
      log.info('Description: {}', [description.toString()])
    }

    const name = value.get('name')
    if (name) {
      log.info('Name: {}', [name.toString()])
    }

    if (image) {
      tokenMetadata.image = image.toString()
    }

    if (description) {
      tokenMetadata.description = description.toString()
    }

    if (name) {
      tokenMetadata.name = name.toString()
    }

    tokenMetadata.save()
  }
}
