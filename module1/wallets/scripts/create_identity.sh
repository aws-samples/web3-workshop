#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

client_id=$(aws ssm get-parameter --name "/app/cognito/app_client_id" --region ${CDK_DEPLOY_REGION} | jq -r ".Parameter.Value")
email=${1}
# password=$(openssl rand -base64 16)
password=Welcome123!?
echo "email: ${email}" | tee .passwd
echo "password: ${password}" | tee -a .passwd

sign_up_request=$( aws cognito-idp sign-up --client-id "${client_id}" --username="${email}" --password "${password}" --user-attributes Name="email",Value="${email}" --region ${CDK_DEPLOY_REGION} )

read -p "email confirmation code: " conf_code
sign_up_confirmation=$(aws cognito-idp confirm-sign-up --client-id "${client_id}" --username="${email}" --confirmation-code="${conf_code}" --region ${CDK_DEPLOY_REGION})

# todo confirm-sign-up does not return status code 
printf "\nsign-up status: successful"
