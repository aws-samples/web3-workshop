#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

RPC_ENDPOINT=""
ALCHEMY_POLICY_ID=""
ALCHEMY_API_KEY=""
NFT_STORAGE_API_TOKEN=""

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# create new user and source jwt or just refresh token if user already exists
function ensure_jwt() {
    # for e2e test user
    if [[ -z ${jwt} ]] && [[ -f .jwt ]]; then
        jwt=$(<.jwt)
    else
        # writing it to main folder
        jwt=$(./module1/wallets/scripts/create_test_identity.sh)
    fi
}

install_cdk=true
install_newman=true
deploy_parameter_stack=true
deploy_api=true
deploy_smart_contract=true
test_api_gateway_curl=true
test_api_e2e_newman=true
deploy_frontend=true

# test dependencies
if [[ ${install_cdk} = true ]]; then
  npm install cdk@2.89.0
fi

if [[ ${install_newman} = true ]]; then
  npm install -g newman@5.3.2
fi

if [[ ${deploy_parameter_stack} = true ]]; then
  # parameter stack will check for an already existing stack and skip deployment
  ./tests/module1/deploy_parameters.sh ${RPC_ENDPOINT} ${ALCHEMY_POLICY_ID} ${ALCHEMY_API_KEY} ${NFT_STORAGE_API_TOKEN}
fi

if [[ ${deploy_api} = true ]]; then
  ./tests/module1/deploy_api.sh
fi

# test user creation
ensure_jwt
jq -R 'split(".") | .[1] | @base64d | fromjson' <<< "${jwt}"


if [[ ${deploy_smart_contract} = true ]]; then
  ./tests/module1/deploy_smart_contract.sh ${jwt}
fi

if [[ ${test_api_gateway_curl} = true ]]; then
  ./tests/module1/test_api_gateway.sh ${jwt}
fi

if [[ ${test_api_e2e_newman} = true ]]; then
  ./tests/module1/run_integration_tests.sh ${jwt} || true
fi

if [[ ${deploy_frontend} = true ]]; then
  ./tests/module1/deploy_frontend.sh
fi
