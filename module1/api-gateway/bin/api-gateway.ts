// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { App, Aspects } from 'aws-cdk-lib';
import { Web3WorkshopApiGatewayStack } from '../lib/api-gateway-stack';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag'

const app = new App();

const apiGatewayStack = new Web3WorkshopApiGatewayStack(app, 'Web3WorkshopApiGatewayStack', {
  env: {
    account: process.env.CDK_DEPLOY_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION
  }
});

Aspects.of(app).add(new AwsSolutionsChecks())

NagSuppressions.addStackSuppressions(apiGatewayStack, [
  { id: 'AwsSolutions-SF2', reason: 'X-Ray tracing is not necessary, and logging is enabled' },
  { id: 'AwsSolutions-IAM4', reason: 'Permissions are needed to log to CloudWatch' },
  { id: 'AwsSolutions-IAM5', reason: 'Permission to read CF stack is restrictive enough' },
  { id: 'AwsSolutions-APIG2', reason: 'Request validation is handled on the backend' },
  { id: 'AwsSolutions-APIG4', reason: 'Options requests without authentication are required for CORS pre-flight requests' },
  { id: 'AwsSolutions-COG4', reason: 'Options requests without authentication are required for CORS pre-flight requests' },
], true);