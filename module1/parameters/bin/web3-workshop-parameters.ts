#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import 'source-map-support/register'
import { App, Aspects } from 'aws-cdk-lib'

import { Web3WorkshopParametersStack } from '../lib/web3-workshop-parameters-stack'
import { AwsSolutionsChecks } from 'cdk-nag'

const app = new App()
new Web3WorkshopParametersStack(app, 'Web3WorkshopParametersStack', {
    env: {
        account: process.env.CDK_DEPLOY_ACCOUNT,
        region: process.env.CDK_DEPLOY_REGION
    }
})

Aspects.of(app).add(new AwsSolutionsChecks())
