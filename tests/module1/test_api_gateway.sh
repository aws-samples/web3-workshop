#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

jwt=${1}

API_GATEWAY_ENDPOINT=$(aws ssm get-parameter --name "/app/api_gateway/invoke_url" --region ${CDK_DEPLOY_REGION} | jq -r ".Parameter.Value" )

# curl -X POST -H 'Accept: application/json' -H 'Content-Type: application/json' -H "Authorization: Bearer ${jwt}" -d '{"prompt":"this is my first sentence NFT"}' ${API_GATEWAY_ENDPOINT}tokens/sentences

# just run simple smoke test to see if API responds and auth works
# minting, burning etc. is being tested in integration tests using postman

curl -X GET -H 'Accept: application/json' -H 'Content-Type: application/json' -H "Authorization: Bearer ${jwt}" ${API_GATEWAY_ENDPOINT}tokens/sentences