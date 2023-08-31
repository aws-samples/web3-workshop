#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set -x
set -e

cd ../../graph_indexer
start=`date +%s`

npm install
cdk synth &&cdk deploy Web3WorkshopTheGraphServiceStack --require-approval=never


npm install -g @graphprotocol/graph-cli

cd subgraphs/genAI
npm install

gen_ai_smart_contract_address=$(aws ssm get-parameter --name /web3/contracts/erc721/genai/address --region ${CDK_DEPLOY_REGION} | jq -r ".Parameter.Value")

# current block
block=9405957

sed -i 's|address: "<HERE GOES YOUR ADDRESS>"|address: "${gen_ai_smart_contract_address}"|g' src/SentencesNFT.sol
sed -i 's|startBlock: <HERE GOES YOUR STARTING BLOCK>|startBlock: ${block}|g' src/SentencesNFT.sol

graph codegen

frontend_build_runtime=$( echo "$end - $start" | bc -l )
echo "TheGraph build: ${frontend_build_runtime}s" >> ../deployment_times
