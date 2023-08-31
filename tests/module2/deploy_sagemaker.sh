#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set -e
set +x

cd module2/sagemaker

start=`date +%s`
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-dev.txt

cdk synth && cdk deploy Web3WorkshopStableDiffusionStack --require-approval=never
deactivate
end=`date +%s`

sagemaker_runtime=$( echo "$end - $start" | bc -l )
echo "Web3WorkshopStableDiffusionStack: ${sagemaker_runtime}s" >> ../deployment_times

cd ..

