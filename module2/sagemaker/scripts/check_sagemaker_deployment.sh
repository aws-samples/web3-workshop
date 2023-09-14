#!/usr/bin/env bash 
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set -e
set +x

SAGEMAKER_API_ENDPOINT_PARAMTER="/app/sagemaker/endpoint/apiurl"

sagemaker_api_endpoint=$(aws ssm get-parameter --name ${SAGEMAKER_API_ENDPOINT_PARAMTER} --region ${CDK_DEPLOY_REGION} | jq -r ".Parameter.Value")

# check if sagemaker endpoint parameter is still set to default parameter
if [[ "${sagemaker_api_endpoint}" == "none" ]]; then
    echo "Sagemaker endpoint not available"
else
    echo "Sagemaker endpoint available"
fi

