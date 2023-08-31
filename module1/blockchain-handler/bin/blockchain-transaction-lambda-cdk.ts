#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import 'source-map-support/register';
import { App, Aspects } from 'aws-cdk-lib';
import { BlockchainTransactionLambdaCdkStack } from '../lib/blockchain-transaction-lambda-cdk-stack';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag'

const app = new App();

const blockchainLambda = new BlockchainTransactionLambdaCdkStack(
  app,
  'Web3WorkshopBlockchainTransactionLambdaStack', {
  env: {
    account: process.env.CDK_DEPLOY_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION
  }
}
);

Aspects.of(app).add(new AwsSolutionsChecks())

NagSuppressions.addStackSuppressions(blockchainLambda, [
  { id: 'AwsSolutions-IAM4', reason: 'AWSLambdaBasicExecutionRole, AWSLambdaVPCAccessExecutionRole are restrictive roles' },
  { id: 'AwsSolutions-IAM5', reason: 'Permission to read CF stack is restrictive enough' },
], true);