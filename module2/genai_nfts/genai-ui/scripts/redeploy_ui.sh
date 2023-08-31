#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

cd ../../../module1/frontend
echo "Redeploying FrontEnd CDK Stack..."
cdk deploy Web3WorkshopFrontEndStack

echo "Redeploying UI"
cd web3-workshop-frontend
npm run version-bump-alpha
git push

# Get the Amplify App ID
app_id=$( aws amplify list-apps | jq -r '.apps[0].appId' )

echo "Run this command to check the progress. Continue once it shows as 'SUCCEED'. ${app_id}"
echo "aws amplify list-jobs --branch-name main --region us-east-1 --app-id ${app_id} | jq -r '.jobSummaries[0].status'"