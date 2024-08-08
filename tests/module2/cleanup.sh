#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

cd module2

cd graph_indexer
cdk destroy Web3WorkshopTheGraphServiceStack --force || true
cd ..

cd sagemaker
if [[ ! -d .venv ]]; then
    cdk destroy Web3WorkshopStableDiffusionStack --force || true
else
    source .venv/bin/activate
    cdk destroy Web3WorkshopStableDiffusionStack --force || true
    deactivate
    rm -rf .venv
fi

cd ..

cd genai_nfts/genai-api-gateway
genai_s3_bucket_arn=$(aws ssm get-parameter --name /app/assets/s3_bucket_genai --region ${CDK_DEPLOY_REGION} | jq -r ".Parameter.Value") || true
genai_s3_bucket_name=$(echo ${genai_s3_bucket_arn} | cut -d: -f6) || true
aws s3 rm s3://${genai_s3_bucket_name} --recursive || true
aws codecommit delete-repository --region ${CDK_DEPLOY_REGION} --repository-name GenAINFT || true
cdk destroy Web3WorkshopGenAILambdaStack Web3WorkshopIPFSLambdaStack Web3WorkshopGenAIApiGatewayStack --force || true
cd ../..

cd genai_nfts/genai-nft-pipeline
cdk destroy Web3WorkshopGenAINFTPipelineStack --force || true
cd ..

aws ssm delete-parameter --region ${CDK_DEPLOY_REGION} --name /web3/contracts/erc721/genai/userophash || true
