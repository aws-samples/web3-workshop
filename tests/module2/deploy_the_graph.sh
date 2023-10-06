#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set -x
set -e

cd module2/graph_indexer
start=`date +%s`

aws ssm put-parameter --name '/app/cloud9_sg' --type 'String' --value "none"  --overwrite | jq

# get local external IP
local_ip=$(curl -s checkip.amazonaws.com)
tmp=$(mktemp)
jq --arg ip "$local_ip" '.context.allowedIP = $ip' cdk.json > "$tmp" && mv "$tmp" cdk.json

npm ci
cdk synth && cdk deploy Web3WorkshopTheGraphServiceStack --require-approval=never

# get external IP
export GRAPH_IP=$(aws ec2 describe-instances --filters 'Name=tag:Name,Values=Web3WorkshopTheGraphServiceStack/GraphCluster/nodeClientLaunchTemplate' --query  'Reservations[0].Instances[0].NetworkInterfaces[0].Association.PublicIp' --output text)

npm install -g @graphprotocol/graph-cli

cd subgraph/genai
npm ci

export gen_ai_smart_contract_address=$(aws ssm get-parameter --name /web3/contracts/erc721/genai/address --region ${CDK_DEPLOY_REGION} | jq -r ".Parameter.Value")

# current block
export block=9803758

## Linux (gnu) sed
# sed -i 's|address: "<HERE GOES YOUR ADDRESS>"|address: "${gen_ai_smart_contract_address}"|g' subgraph.yaml
# sed -i 's|startBlock: <HERE GOES YOUR STARTING BLOCK>|startBlock: ${block}|g' subgraph.yaml

## Mac sed
# sed -i '' "s|address: \"<HERE GOES YOUR ADDRESS>\"|address: \"${gen_ai_smart_contract_address}\"|g" subgraph.yaml
# sed -i '' "s|startBlock: <HERE GOES YOUR STARTING BLOCK>|startBlock: ${block}|g" subgraph.yaml

## yq
yq  -i '.dataSources[0].source.address = strenv(gen_ai_smart_contract_address)' subgraph.yaml
yq  -i '.dataSources[0].source.startBlock = env(block)' subgraph.yaml

graph codegen

graph create --node http://${GRAPH_IP}:8020/ genai
graph deploy --node http://${GRAPH_IP}:8020/ --ipfs http://${GRAPH_IP}:5001 --version-label v1 genai

cd ../..


graph_build_time=$( echo "$end - $start" | bc -l )
echo "TheGraph build: ${graph_build_time}s" >> ../deployment_times
