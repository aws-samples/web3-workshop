#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set -e
set +x

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

install_yq=false
deploy_sagemaker=true
deploy_genai_pipeline=true
deploy_genai_smart_contract=true
test_api_e2e_newman=false
deploy_the_graph=true
redeploy_frontend=true

if [[ ${install_yq} = true ]]; then
  YQ_VERSION=v4.35.2
  YQ_BINARY=yq_linux_amd64
  wget https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/${YQ_BINARY}.tar.gz -O - | tar xz && sudo mv ${YQ_BINARY} /usr/bin/yq
  yq --version
fi

if [[ ${deploy_sagemaker} ]]; then
   ./tests/module2/deploy_sagemaker.sh
fi

if [[ ${deploy_genai_pipeline} ]]; then
  ./tests/module2/deploy_genai_pipeline.sh
fi

# test user creation
ensure_jwt
jq -R 'split(".") | .[1] | @base64d | fromjson' <<< "${jwt}"

if [[ ${deploy_genai_smart_contract} ]]; then
    ./tests/module2/deploy_smart_contract.sh ${jwt}
fi

if [[ ${test_api_e2e_newman} ]]; then
    ./tests/module2/run_integration_tests.sh ${jwt} || true
fi

if [[ ${deploy_the_graph} ]]; then
  ./tests/module2/deploy_the_graph.sh
fi

if [[ ${redeploy_frontend]} ]]; then
  ./tests/module2/redeploy_frontend.sh
fi
