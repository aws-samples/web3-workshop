#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

gen_ai_pipeline=true
gen_ai_lambda=true
gen_ai_gateway=true

cd module2/genai_nfts

# gen_ai_pipeline
if [[ ${gen_ai_pipeline} = true ]]; then
    cd ./genai-nft-pipeline
    
    start=`date +%s`
    npm install #&& npm audit fix --force
    cdk synth && cdk deploy Web3WorkshopGenAINFTPipelineStack --require-approval=never
    end=`date +%s`
    
    genai_nft_pipeline_runtime=$( echo "$end - $start" | bc -l )
    echo "Web3WorkshopGenAINFTPipelineStack: ${genai_nft_pipeline_runtime}s" > ../../deployment_times
    cd ..
fi

# gen ai api gateway /
cd ./genai-api-gateway
if [[ ${gen_ai_lambda} = true ]]; then
    start=`date +%s`
    npm install
    cdk synth Web3WorkshopIPFSLambdaStack Web3WorkshopGenAILambdaStack Web3WorkshopGenAIApiGatewayStack  && cdk deploy Web3WorkshopIPFSLambdaStack Web3WorkshopGenAILambdaStack Web3WorkshopGenAIApiGatewayStack --require-approval=never
    ./scripts/redeploy_apigateway.sh

    end=`date +%s`
    
    genai_lambda_stack_runtime=$( echo "$end - $start" | bc -l )
    echo "Web3WorkshopGenAILambdaStacks: ${genai_lambda_stack_runtime}s" >> ../../deployment_times
fi

cd ..
