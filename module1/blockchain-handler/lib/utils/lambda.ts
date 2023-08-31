// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { LambdaResponse } from '../types';

export function respond({ statusCode = 200, headers = {}, body = {} }): LambdaResponse {
  headers = Object.assign(
    {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Headers':
        'Content-Type,X-Amz-Date,X-Amz-Security-Token,Authorization,X-Api-Key,X-Requested-With,Accept,Access-Control-Allow-Methods,Access-Control-Allow-Origin,Access-Control-Allow-Headers',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE',
      'Access-Control-Allow-Origin': '*'
    },
    headers
  );

  return {
    isBase64Encoded: false,
    statusCode,
    headers,
    body: JSON.stringify(body)
  };
}

export function respondToError({
  error,
  headers = {}
}: {
  error: { statusCode: number; message: string };
  headers?: object;
}) {
  console.error(error);

  const { statusCode = 500, message = 'Unexpected error' } = error;

  return respond({ statusCode, headers, body: { error: message } });
}

export function respondToInvalid(message = 'Bad request') {
  return respondToError({ error: { statusCode: 400, message } });
}

export function respondToNotFound(message = 'Not found') {
  return respondToError({ error: { statusCode: 404, message } });
}
