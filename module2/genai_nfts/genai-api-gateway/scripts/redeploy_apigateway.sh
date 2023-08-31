#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

echo "Redeploying stage 'main'..."

rest_api_id=$(aws apigateway get-rest-apis --query 'items[?name==`Web3WorkshopAPI`]' | jq -r ".[].id")

aws apigateway create-deployment --stage-name main --rest-api-id ${rest_api_id}

echo "Successfully redeployed stage 'main'"