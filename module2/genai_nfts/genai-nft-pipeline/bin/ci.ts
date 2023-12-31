#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CiStack } from '../lib/ci-stack';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';

const app = new cdk.App();
const pipelineStack = new CiStack(app, 'Web3WorkshopGenAINFTPipelineStack', {
    env: {
        account: process.env.CDK_DEPLOY_ACCOUNT,
        region: process.env.CDK_DEPLOY_REGION
    }
});

cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))
NagSuppressions.addStackSuppressions(pipelineStack, [
    { id: 'AwsSolutions-IAM5', reason: 'Permission to read CF stack is restrictive enough' },
    { id: 'AwsSolutions-S1', reason: 'Access logs not required on the bucket' },
    { id: 'AwsSolutions-CB4', reason: 'Artifacts are encrypted by default in the S3 bucket' },
    { id: 'AwsSolutions-KMS5', reason: 'KMS key rotation not required' },
], true);