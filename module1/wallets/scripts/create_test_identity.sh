#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

suffix=${1:-0}
email="john+${suffix}@doe.com"

# tmp_password=$(openssl rand -base64 16)
tmp_password=Welcome123!tmp???
# echo "temp password: ${password}"

# new_password=$(openssl rand -base64 16)
new_password=Welcome123!?

user_pool_id=$(aws ssm get-parameter --name "/app/cognito/user_pool_id" --region ${CDK_DEPLOY_REGION} | jq -r ".Parameter.Value")
client_id=$(aws ssm get-parameter --name "/app/cognito/app_client_id" --region ${CDK_DEPLOY_REGION} | jq -r ".Parameter.Value")

if [[ ! -f .${email} ]]; then
    create_user_response=$(aws cognito-idp admin-create-user --user-pool-id ${user_pool_id} --username ${email} --message-action SUPPRESS --temporary-password ${tmp_password} --region ${CDK_DEPLOY_REGION})
    update_user_password_response=$(aws cognito-idp admin-set-user-password --user-pool-id ${user_pool_id}  --username ${email} --password ${new_password}  --permanent --region ${CDK_DEPLOY_REGION})
    echo "${email}:${new_password}" > .${email}
fi

id_token=$(aws cognito-idp initiate-auth --auth-flow "USER_PASSWORD_AUTH" --client-id "${client_id}" --auth-parameters USERNAME="${email}",PASSWORD="${new_password}" --region ${CDK_DEPLOY_REGION} | jq -r ".AuthenticationResult.IdToken")
echo ${id_token} | tee .jwt
