#!/usr/bin/env bash

set -e
set +x

rpc_endpoint=${1}
alchemy_policy_id=${2}
alchemy_goerli_api_key=${3}
nft_storage_api_token=${4}

parameter_stack_name="Web3WorkshopParametersStack"
parameter_stack_name_lc=$(echo "${parameter_stack_name}" | awk '{print tolower($0)}')
# parameters
cd module1/parameters

# check if the stack already exits
if ! aws cloudformation describe-stacks --stack-name ${parameter_stack_name} &> /dev/null && \
 ! aws cloudformation describe-stacks --stack-name ${parameter_stack_name_lc} &> /dev/null; then
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
else
    echo "Web3WorkshopParametersStack already exists, skipping deployment"
    echo "Web3WorkshopParametersStack: na" > ../deployment_times
fi
cd ..
