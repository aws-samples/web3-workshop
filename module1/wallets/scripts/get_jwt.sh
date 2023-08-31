#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

email=${1}
password=${2}

client_id=$(aws ssm get-parameter --name "/app/cognito/app_client_id" --region ${CDK_DEPLOY_REGION} | jq -r ".Parameter.Value")
id_token=$(aws cognito-idp initiate-auth --auth-flow "USER_PASSWORD_AUTH" --client-id "${client_id}" --auth-parameters USERNAME="${email}",PASSWORD="${password}" --region ${CDK_DEPLOY_REGION} | jq -r ".AuthenticationResult.IdToken")

echo ${id_token} | tee .jwt
