#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set -e
set +x

app_id=$( aws amplify list-apps --region ${CDK_DEPLOY_REGION} | jq -r '.apps[0].appId' )

cd module1

# UI
cd frontend

start=`date +%s`
npm install #&& npm audit fix --force
cdk synth && cdk deploy Web3WorkshopFrontEndStack --require-approval=never -O frontend_output.json
end=`date +%s`

frontend_runtime=$( echo "$end - $start" | bc -l )
echo "Web3WorkshopGenAIFrontEndStack: ${frontend_runtime}s" >> ../deployment_times

cd web3-workshop-frontend

start=`date +%s`
yes | git defender -setup || true
npm run version-bump-alpha
git push -f


# poll build status till succeed
while true; do
    build_status=$( aws amplify list-jobs --branch-name main --region ${CDK_DEPLOY_REGION} --app-id ${app_id} | jq -r '.jobSummaries[0].status' )
    if [[ ${build_status} == 'SUCCEED' ]]; then
        echo "build succeed: https://main.${app_id}.amplifyapp.com"
        break
    fi
    sleep 5
done

end=`date +%s`

frontend_build_runtime=$( echo "$end - $start" | bc -l )
echo "Frontend GenAI build: ${frontend_build_runtime}s" >> ../deployment_times
