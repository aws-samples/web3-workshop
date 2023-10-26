#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

cd module1

# UI
cd frontend

start=`date +%s`
npm install #&& npm audit fix --force
cdk synth && cdk deploy Web3WorkshopFrontEndStack --require-approval=never -O frontend_output.json
end=`date +%s`

frontend_runtime=$( echo "$end - $start" | bc -l )
echo "Web3WorkshopFrontEndStack: ${frontend_runtime}s" >> ../deployment_times


frontend_repo=$( cat frontend_output.json | jq -r '.Web3WorkshopFrontEndStack.FrontendCodeCommitCloneUrlGRC' )
app_id=$( aws amplify list-apps --region ${CDK_DEPLOY_REGION} | jq -r '.apps[0].appId' )

if [[ ! -d web3-workshop-frontend ]]; then
    git clone ${frontend_repo}
fi

cd web3-workshop-frontend

start=`date +%s`

yes | git defender -setup || true
npm run version-bump-alpha
git push -f
cd ..

# poll build status till succeed
while true; do
    build_status=$( aws amplify list-jobs --branch-name main --region ${CDK_DEPLOY_REGION} --app-id ${app_id} | jq -r '.jobSummaries[0].status' )
    if [[ ${build_status} == 'SUCCEED' ]]; then
        echo "UI build succeeded"
        echo "UI is available at: https://main.${app_id}.amplifyapp.com"
        break
    fi
    sleep 5
done

end=`date +%s`

frontend_build_runtime=$( echo "$end - $start" | bc -l )
echo "Frontend build: ${frontend_build_runtime}s" >> ../deployment_times

cd ..
