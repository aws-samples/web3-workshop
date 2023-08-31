#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

# list of modules
cdk=true
newman=true
parameters=true
wallets=true
pipeline=true
blockchain_handler=true
api_gateway=true

rpc_endpoint=${1}
alchemy_policy_id=${2}
alchemy_goerli_api_key=${3}
nft_storage_api_token=${4}

region=$(aws configure get region)

if [[ ${cdk} = true ]]; then
    npm install cdk@2.89.0
fi

if [[ ${newman} = true ]]; then
    npm install -g newman@5.3.2
fi

cd module1

# parameters
if [[ ${parameters} = true ]]; then
    cd parameters
    
    start=`date +%s`
    npm install #&& npm audit fix --force
    cdk synth && cdk deploy Web3WorkshopParametersStack \
    --parameters rpcEndpoint="${rpc_endpoint}" \
    --parameters alchemyPolicyId="${alchemy_policy_id}" \
    --parameters alchemyGoerliAPIKey="${alchemy_goerli_api_key}" \
    --parameters nftStorageAPIToken="${nft_storage_api_token}" \
    --require-approval=never
    
    end=`date +%s`
    
    parameters_runtime=$( echo "$end - $start" | bc -l )
    echo "Web3WorkshopParametersStack: ${parameters_runtime}s" > ../deployment_times
    cd ..
fi

# wallets
if [[ ${wallets} = true ]]; then
    cd wallets
    
    start=`date +%s`
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    pip install -r requirements-dev.txt
    
    cdk synth && cdk deploy Web3WorkshopCognitoKMSStack --require-approval=never
    deactivate
    end=`date +%s`
    
    wallets_runtime=$( echo "$end - $start" | bc -l )
    echo "Web3WorkshopCognitoKMSStack: ${wallets_runtime}s" >> ../deployment_times
    
    cd ..
fi


# nft pipeline
if [[ ${pipeline} = true ]]; then
    cd nft-pipeline
    
    start=`date +%s`
    npm install #&& npm audit fix --force
    # todo write params to output file and push to repo to trigger pipeline
    cdk synth && cdk deploy Web3WorkshopNFTPipelineStack --require-approval=never -O nft_pipeline_output.json
    end=`date +%s`
    
    nft_pipeline_runtime=$( echo "$end - $start" | bc -l )
    echo "Web3WorkshopNFTPipelineStack: ${nft_pipeline_runtime}s" >> ../deployment_times
    
    contract_repo=$( cat nft_pipeline_output.json | jq -r '.Web3WorkshopNFTPipelineStack.GitRepoCloneUrlGrc' )
    if [[ ! -d ContractRepo ]]; then
        git clone ${contract_repo}
    fi
    
    # todo git clone code commit repo -> ensure codecommit plugin has been installed
    cd ContractRepo
    
    yes | git defender -setup || true
    # no inplace modification to keep sed compatible to Linux and Mac shell
    sed "s|MAX_NFTS_PER_ADDRESS = 5|MAX_NFTS_PER_ADDRESS = 50|g" src/SentencesNFT.sol > src/SentencesNFT.sol.new
    cp src/SentencesNFT.sol.new src/SentencesNFT.sol
    
    git add -u
    git commit -m "updated max nfts per address parameter"
    git push
    cd ..
    
    cd ..
fi

# blockchain handler
if [[ ${blockchain_handler} = true ]]; then
    cd blockchain-handler
    
    start=`date +%s`
    npm install #&& npm audit fix --force
    cdk synth && cdk deploy Web3WorkshopBlockchainTransactionLambdaStack --require-approval=never
    end=`date +%s`
    
    blockchain_handler_runtime=$( echo "$end - $start" | bc -l )
    echo "Web3WorkshopBlockchainTransactionLambdaStack: ${blockchain_handler_runtime}s" >> ../deployment_times
    
    cd ..
fi


# API Gateway
if [[ ${api_gateway} = true ]]; then
    cd api-gateway
    
    start=`date +%s`
    npm install #&& npm audit fix --force
    cdk synth && cdk deploy Web3WorkshopApiGatewayStack --require-approval=never
    end=`date +%s`
    
    api_gateway_runtime=$( echo "$end - $start" | bc -l )
    echo "Web3WorkshopApiGatewayStack: ${api_gateway_runtime}s" >> ../deployment_times
    
    cd ..
fi