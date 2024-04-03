#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

jwt=${1}

lambda_function_arn=$(aws ssm get-parameter --name "/app/nft/lambda_arn" --region ${CDK_DEPLOY_REGION} | jq -r ".Parameter.Value")

# not compatibile with jq < 1.6
parsed_jwt=$(jq -R 'split(".") | .[1] | @base64d | fromjson' <<< "$jwt")

jwt_public_address=$(echo $parsed_jwt | jq -r '.public_address')
jwt_key_id=$(echo $parsed_jwt | jq -r '.key_id')
jwt_sub=$(echo $parsed_jwt | jq -r '.sub')

SMART_CONTRACT_DEPLOYMENT='
{
  "contractType": "ERC721",
  "ownerAddress": "",
  "invocationFunction": "deploy",
  "nftCollectionName": "sentences",
  "userKeyId": "",
  "sub": ""
}'

echo "${SMART_CONTRACT_DEPLOYMENT}" | jq '.ownerAddress="'${jwt_public_address}'" | .userKeyId="'${jwt_key_id}'" | .sub="'${jwt_sub}'"' > .tmp.payload

response=$(aws lambda invoke --region ${CDK_DEPLOY_REGION} --cli-binary-format raw-in-base64-out --function-name "${lambda_function_arn}" --payload file://.tmp.payload .tmp.out)

smart_contract_deployment_result=$(cat .tmp.out | jq -r '.body')
if [[ ${smart_contract_deployment_result} == *error* ]]; then
    echo "error happened deploying the smart contract"
else
    echo ${smart_contract_deployment_result} | tee .user_op_hash
fi

#rm -rf .tmp.out .tmp.payload
