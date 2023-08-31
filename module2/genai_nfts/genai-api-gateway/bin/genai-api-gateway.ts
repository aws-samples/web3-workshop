#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import "source-map-support/register";
import { App, Aspects } from "aws-cdk-lib";
import { GenaiApiGatewayStack } from "../lib/genai-api-gateway-stack";
import { GenAILambdaStack } from "../lib/genai-lambda-stack";
import { IpfsLambdaStack } from "../lib/ipfs-lambda-stack";
import { AwsSolutionsChecks, NagSuppressions } from "cdk-nag";

const app = new App();

// Create the Sagemaker GenAI StepFunction workflow construct
const genAIConstruct = new GenAILambdaStack(
  app,
  "Web3WorkshopGenAILambdaStack", {
  env: {
    account: process.env.CDK_DEPLOY_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION
  }
}
);

// Create the IpfsLambda construct
const ipfsConstruct = new IpfsLambdaStack(app, "Web3WorkshopIPFSLambdaStack", {
  env: {
    account: process.env.CDK_DEPLOY_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION
  }
});

const genaiApiGatewayStack = new GenaiApiGatewayStack(
  app,
  "Web3WorkshopGenAIApiGatewayStack", {
  env: {
    account: process.env.CDK_DEPLOY_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION
  }
}
);

ipfsConstruct.addDependency(genAIConstruct);
genaiApiGatewayStack.addDependency(genAIConstruct);
// how does that even work - circular dependency???
genaiApiGatewayStack.addDependency(ipfsConstruct);

Aspects.of(app).add(new AwsSolutionsChecks());

NagSuppressions.addStackSuppressions(
  genaiApiGatewayStack,
  [
    {
      id: "AwsSolutions-SF2",
      reason: "X-Ray tracing is not necessary, and logging is enabled",
    },
    {
      id: "AwsSolutions-IAM5",
      reason: "Permission to read CF stack is restrictive enough",
    },
    { id: "AwsSolutions-APIG1", reason: "Access logging not required" },
    {
      id: "AwsSolutions-APIG2",
      reason: "Request validation is handled on the backend",
    },
    {
      id: "AwsSolutions-APIG4",
      reason:
        "Options requests without authentication are required for CORS pre-flight requests",
    },
    {
      id: "AwsSolutions-COG4",
      reason:
        "Options requests without authentication are required for CORS pre-flight requests",
    },
  ],
  true
);

NagSuppressions.addStackSuppressions(
  genAIConstruct,
  [
    {
      id: "AwsSolutions-IAM4",
      reason:
        "AWSLambdaBasicExecutionRole, AWSLambdaVPCAccessExecutionRole are restrictive roles",
    },
    {
      id: "AwsSolutions-IAM5",
      reason: "Permission to read CF stack is restrictive enough",
    },
    { id: "AwsSolutions-KMS5", reason: "Key rotation is not required" },
    { id: "AwsSolutions-S1", reason: "Server access logs are not required" },
    {
      id: "AwsSolutions-L1",
      reason: "Python v3.9 is sufficient for this application",
    },
  ],
  true
);

NagSuppressions.addStackSuppressions(
  ipfsConstruct,
  [
    {
      id: "AwsSolutions-IAM4",
      reason:
        "AWSLambdaBasicExecutionRole, AWSLambdaVPCAccessExecutionRole are restrictive roles",
    },
    {
      id: "AwsSolutions-IAM5",
      reason: "Permission to read CF stack is restrictive enough",
    },
  ],
  true
);
