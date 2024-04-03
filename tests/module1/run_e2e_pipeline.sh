#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

RPC_ENDPOINT="https://rpc.sepolia.org"
ALCHEMY_POLICY_ID="171323a0-dd77-4d75-b848-18f5cd99419f"
ALCHEMY_API_KEY="tPlhuS4IDHbHHU7RBsZTUN9tciY4ojor"
NFT_STORAGE_API_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDkzQjdGYTU1ZjZCQzg1QTA4N2Y1QWI3NGZFYkFERDMyNzk2MDc5QjgiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY5ODE4MzE0ODUyNSwibmFtZSI6IkJ1aWxkV2ViM1dvcmtzaG9wIn0.L0cNzak5hsH7BIOfmLKMzIg11C3j988EKDru3U-ke4Q"
PAYMASTER_ENDPOINT="https://eth-sepolia.g.alchemy.com/v2/tPlhuS4IDHbHHU7RBsZTUN9tciY4ojor"

export RPC_ENDPOINT=$RPC_ENDPOINT
export ALCHEMY_API_KEY=$ALCHEMY_API_KEY
export ALCHEMY_POLICY_ID=$ALCHEMY_POLICY_ID
export NFT_STORAGE_API_TOKEN=$NFT_STORAGE_API_TOKEN
export PAYMASTER_ENDPOINT=$PAYMASTER_ENDPOINT

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# create new user and source jwt or just refresh token if user already exists
function ensure_jwt() {
    # for e2e test user
    if [[ -z ${jwt} ]] && [[ -f .jwt ]]; then
        jwt=$(<.jwt)
    else
        # writing it to main folder
        jwt=$($CRIPT_DIR../../module1/wallets/scripts/create_test_identity.sh)
    fi
}

install_aws_cli_v2=false
install_jq_v1_6=false
install_cdk=false
install_newman=false
deploy_parameter_stack=true
deploy_api=true
deploy_smart_contract=true
test_api_gateway_curl=true
test_api_e2e_newman=false
deploy_frontend=true


# test dependencies
if [[ ${install_aws_cli_v2} = true ]]; then
  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
  unzip awscliv2.zip
  sudo ./aws/install --bin-dir /usr/bin --install-dir /usr/local/aws-cli --update
  aws --version
fi

if [[ ${install_jq_v1_6} = true ]]; then
  curl -L "https://github.com/jqlang/jq/releases/download/jq-1.6/jq-linux64" -o "jq-linux64"
  chmod +x jq-linux64
  sudo mv jq-linux64 /usr/bin/jq
  jq --version
fi

if [[ ${install_cdk} = true ]]; then
  npm install cdk@2.89.0
fi

if [[ ${install_newman} = true ]]; then
  npm install -g newman@5.3.2
fi

if [[ ${deploy_parameter_stack} = true ]]; then
  # parameter stack will check for an already existing stack and skip deployment
  $SCRIPT_DIR/deploy_parameters.sh ${RPC_ENDPOINT} ${ALCHEMY_POLICY_ID} ${ALCHEMY_API_KEY} ${NFT_STORAGE_API_TOKEN} ${PAYMASTER_ENDPOINT}
fi

if [[ ${deploy_api} = true ]]; then
  $SCRIPT_DIR/deploy_api.sh
fi

# test user creation
ensure_jwt
jq -R 'split(".") | .[1] | @base64d | fromjson' <<< "${jwt}"


if [[ ${deploy_smart_contract} = true ]]; then
  $SCRIPT_DIR/deploy_smart_contract.sh ${jwt}
fi

if [[ ${test_api_gateway_curl} = true ]]; then
  $SCRIPT_DIR/test_api_gateway.sh ${jwt}
fi

if [[ ${test_api_e2e_newman} = true ]]; then
  $SCRIPT_DIR/run_integration_tests.sh ${jwt} || true
fi

if [[ ${deploy_frontend} = true ]]; then
  $SCRIPT_DIR/deploy_frontend.sh
fi
