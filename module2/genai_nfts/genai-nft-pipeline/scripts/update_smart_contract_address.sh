#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

lambda_function_arn=$(aws ssm get-parameter --name "/app/nft/lambda_arn" --region ${CDK_DEPLOY_REGION} | jq -r ".Parameter.Value" )

response=$(aws lambda invoke --region ${CDK_DEPLOY_REGION} --cli-binary-format raw-in-base64-out --function-name "${lambda_function_arn}" --payload  '{"invocationFunction": "updateNFTContractAddress", "nftCollectionName": "genai"}' .tmp.out  )
contract_address=$(cat .tmp.out | jq -r '.body' | tr -d '"')

echo "0x${contract_address: -40}"

rm -rf .tmp.out
