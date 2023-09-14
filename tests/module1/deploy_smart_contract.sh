#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

deploy_smart_contract=true
update_smart_contract_address=true

jwt=${1}
# echo $PWD
# echo $SCRIPT_DIR

if [[ ${deploy_smart_contract} = true ]]; then
    start=`date +%s`
    while true; do
        
        userop_hash=$(./module1/blockchain-handler/scripts/deploy_smart_contract.sh ${jwt})
        
        if [[ ${userop_hash} != *error* ]]; then
            break
        fi
        
        sleep 10
        
    done
    
    alchemy_goerli_api_key=$(aws ssm get-parameter --name "/web3/aa/goerli_api_key" --region ${CDK_DEPLOY_REGION} | jq -r ".Parameter.Value")
    
    while true; do
        user_op_status=$(curl -s --request POST \
            --url https://eth-goerli.g.alchemy.com/v2/${alchemy_goerli_api_key} \
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
    smart_contract_address=$(./module1/blockchain-handler/scripts/update_smart_contract_address.sh)
fi
