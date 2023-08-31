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

./tests/module1/deploy_api.sh ${RPC_ENDPOINT} ${ALCHEMY_POLICY_ID} ${ALCHEMY_API_KEY} ${NFT_STORAGE_API_TOKEN}

# test user creation
ensure_jwt
jq -R 'split(".") | .[1] | @base64d | fromjson' <<< "${jwt}"

./tests/module1/deploy_smart_contract.sh ${jwt}
./tests/module1/test_api_gateway.sh ${jwt}
./tests/module1/run_integration_tests.sh ${jwt} || true
./tests/module1/deploy_frontend.sh
