// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib";
const { StringParameter } = require("aws-cdk-lib/aws-ssm");

export class IpfsLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const parameterStoreARNs = `arn:aws:ssm:${this.region}:${this.account}:parameter/web3/nftstorage/apitoken`;

    const bucketArn = StringParameter.valueForStringParameter(
      this,
      "/app/assets/s3_bucket_genai"
    );

    const lambda = new NodejsFunction(this, "IPFSPublishLambda", {
      runtime: Runtime.NODEJS_18_X,
      entry: path.join(
        __dirname,
        "/../lambda/IPFSPublishLambda/src/handlers/IPFSPublishLambda.js"
      ),
      handler: "handler",
      timeout: cdk.Duration.seconds(300),
      environment: {},
      role: new iam.Role(this, "IPFSPublishLambdaRole", {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
        ],
        inlinePolicies: {
          s3AccessPolicy: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["s3:ListBucket", "s3:GetObject"],
                resources: [bucketArn, bucketArn + "/*"],
              }),
            ],
          }),
          ssmAccessPolicy: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["ssm:DescribeParameters", "ssm:GetParameter"],
                resources: [parameterStoreARNs],
              }),
            ],
          }),
          kmsAccessPolicy: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["kms:Decrypt"],
                resources: ["*"],
              }),
            ],
          }),
        },
      }),
    });

    // Add the Lambda function's ARN to AWS SSM Parameter Store
    new ssm.StringParameter(
      this,
      "InvokeIPFSPublishLambdaFunctionArnParameter",
      {
        parameterName: "/app/nft/IPFSLambdaARNParameter",
        stringValue: lambda.functionArn,
      }
    );
  }
}
