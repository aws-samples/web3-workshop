#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const cdk = require('aws-cdk-lib');
const { FrontEndStack } = require('../lib/frontend-stack');
const { AwsSolutionsChecks } = require('cdk-nag');

const app = new cdk.App();
new FrontEndStack(app, 'Web3WorkshopFrontEndStack', {
    env: {
        account: process.env.CDK_DEPLOY_ACCOUNT,
        region: process.env.CDK_DEPLOY_REGION
    }
});

cdk.Aspects.of(app).add(new AwsSolutionsChecks());
