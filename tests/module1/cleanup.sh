#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

# delete all files created during deployment and integration testing run
rm -rf .jwt .john* package-lock.json package.json

cd ../../module1

cd frontend
cdk destroy Web3WorkshopFrontEndStack --force || true
rm -rf web3-workshop-frontend frontend_output.json
cd ..

cd api-gateway
cdk destroy Web3WorkshopApiGatewayStack --force || true
cd ..

cd blockchain-handler
cdk destroy Web3WorkshopBlockchainTransactionLambdaStack --force || true
# todo has to be created in the stack /web3/contracts/erc721/sentences/userophash
aws ssm delete-parameter --region ${CDK_DEPLOY_REGION} --name /web3/contracts/erc721/sentences/userophash || true
cd ..

cd nft-pipeline
solidity_s3_bucket_arn=$(aws ssm get-parameter --name /app/assets/s3bucketurl --region ${CDK_DEPLOY_REGION} | jq -r ".Parameter.Value") || true
solidity_s3_bucket_name=$(echo ${solidity_s3_bucket_arn} | cut -d: -f6) || true
aws s3 rm s3://${solidity_s3_bucket_name} --recursive || true
cdk destroy Web3WorkshopNFTPipelineStack --force || true
rm -rf ContractRepo nft_pipeline_output.json
cd ..

cd wallets
# todo check if venv is available -> then source otherwise ignore
if [[ ! -d .venv ]]; then
    cdk destroy Web3WorkshopCognitoKMSStack --force || true
else
    source .venv/bin/activate
    cdk destroy Web3WorkshopCognitoKMSStack --force || true
    deactivate
fi

rm -rf .venv .jwt .passwd .john*

cd ..

cd parameters
cdk destroy Web3WorkshopParametersStack --force || true
cd ..

aws ssm delete-parameter --region ${CDK_DEPLOY_REGION} --name /app/cloud9_sg || true
