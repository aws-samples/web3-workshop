#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# file template located in .env.example
source ${SCRIPT_DIR}/.env

# create new user and source jwt or just refresh token if user already exists
function ensure_jwt() {
    # for e2e test user
    if [[ -z ${jwt} ]] && [[ -f .jwt ]]; then
        jwt=$(<.jwt)
    else
        # writing it to main folder
        jwt=$($SCRIPT_DIR/../../module1/wallets/scripts/create_test_identity.sh)
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
test_api_e2e_newman=true
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
  echo "Deploying smart contract - check the Alchemy Dashboard if this step fails or gets stuck."
  $SCRIPT_DIR/deploy_smart_contract.sh ${jwt}
fi

if [[ ${test_api_gateway_curl} = true ]]; then
  echo "Testing API Gateway"
  $SCRIPT_DIR/test_api_gateway.sh ${jwt}
fi

if [[ ${test_api_e2e_newman} = true ]]; then
  $SCRIPT_DIR/run_integration_tests.sh ${jwt} || true
fi

if [[ ${deploy_frontend} = true ]]; then
  echo "Deploying frontend"
  $SCRIPT_DIR/deploy_frontend.sh
fi
