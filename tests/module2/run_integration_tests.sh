#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

jwt=${1}

api_endpoint=$(aws ssm get-parameter --name "/app/sagemaker/endpoint/apiurl" --region ${CDK_DEPLOY_REGION} | jq -r ".Parameter.Value" )
newman run ./tests/module2/postman/module2_integration_test.json --env-var "baseUrl=${api_endpoint}" --env-var "jwt=${jwt}" --verbose --bail
