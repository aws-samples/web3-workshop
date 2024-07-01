#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

deploy_smart_contract=true
update_smart_contract_address=true

jwt=${1}

# TODO: add a counter so that we don't keep trying to deploy the contract forever
if [[ ${deploy_smart_contract} = true ]]; then
    start=`date +%s`
    while true; do
        
        userop_hash=$($SCRIPT_DIR/../../module1/blockchain-handler/scripts/deploy_smart_contract.sh ${jwt})
        
        if [[ ${userop_hash} != *error* ]]; then
            break
        fi
        
        sleep 10
        
    done
    
    deployment_params=$(aws ssm get-parameters --region ${CDK_DEPLOY_REGION} --name \
    "/web3/aa/alchemy_api_key" \
    "/web3/rpc_endpoint" \
    --query "Parameters[*].{Name:Name,Value:Value}" | jq 'INDEX(.Name)'
    )

    alchemy_api_key=$(echo ${deployment_params} | jq -r '."/web3/aa/alchemy_api_key".Value')
    rpc_endpoint=$(echo ${deployment_params} | jq -r '."/web3/rpc_endpoint".Value')

    while true; do
        user_op_status=$(curl -s --request POST \
            --url ${rpc_endpoint}/${alchemy_api_key} \
            --header 'accept: application/json' \
            --header 'content-type: application/json' \
        --data '{"id": 1, "jsonrpc": "2.0", "method": "eth_getUserOperationByHash", "params": ['${userop_hash}']}')
        user_op_result=$(echo ${user_op_status} | jq -r '.result // empty')
        
        if [[ -z ${user_op_result} ]]; then
            echo "User operation not mined yet"
        else
            break
        fi
        sleep 5
    done
    end=`date +%s`
    
    user_operation_runtime=$( echo "$end - $start" | bc -l )
    echo "Smart Contract deploy UserOp confirmation: ${user_operation_runtime}s" >> ../deployment_times
fi

if [[ ${update_smart_contract_address} = true ]]; then
    smart_contract_address=$($SCRIPT_DIR/../../module1/blockchain-handler/scripts/update_smart_contract_address.sh)
fi
