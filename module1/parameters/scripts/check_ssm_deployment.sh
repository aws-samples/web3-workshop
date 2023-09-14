#!/usr/bin/env bash
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
set +x
set -e

parameter_stack_name="Web3WorkshopParametersStack"
parameter_stack_name_lc=$(echo "${parameter_stack_name}" | awk '{print tolower($0)}')

# check if the stack already exits
if ! aws cloudformation describe-stacks --stack-name ${parameter_stack_name} &> /dev/null && \
 ! aws cloudformation describe-stacks --stack-name ${parameter_stack_name_lc} &> /dev/null; then
    echo "SSM Parameters not deployed"
else
    echo "SSM Parameters deployed"
fi