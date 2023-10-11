// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

export class GenAILambdaStack extends Stack {
  readonly s3Bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const pandasLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "PandasLayer",
      `arn:aws:lambda:${this.region}:336392948345:layer:AWSSDKPandas-Python311:1`
    );

    const bedrockCompatibleBoto3 = new lambda.LayerVersion(
      this,
      "BedrockCompatibleBoto3Layer",
      {
        compatibleRuntimes:[lambda.Runtime.PYTHON_3_9],
        code: lambda.Code.fromAsset("../genai-assets/bedrock-compatible-sdk.zip"),
      }
    )

    // Create the S3 bucket
    this.s3Bucket = new s3.Bucket(this, "GenAIS3Bucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      enforceSSL: true,
      encryption: s3.BucketEncryption.KMS,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // Save S3 Bucket ARN for further use
    const s3BucketSSMParam = new ssm.StringParameter(
      this,
      "GenAIS3BucketSSMParameter",
      {
        parameterName: "/app/assets/s3_bucket_genai",
        stringValue: this.s3Bucket.bucketArn,
      }
    );
    s3BucketSSMParam.node.addDependency(this.s3Bucket);

    const parameterStoreSageMakerARNs = `arn:aws:ssm:${this.region}:${this.account}:parameter/app/sagemaker/endpoint/*`;
    const parameterSageMakerEndpoints = `arn:aws:ssm:${this.region}:${this.account}:parameter/app/sagemaker/endpoint/*`;

    const invokeExternalSagemakerEndpointLambdaFunction = new PythonFunction(
      this,
      "InvokeExternalSagemakerEndpoint",
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        entry: "lambda/InvokeSagemakerLambdaAssets",
        index: "InvokeExternalSagemakerEndpoint.py",
        handler: "lambda_handler",
        layers: [
          pandasLayer,
          bedrockCompatibleBoto3
        ],
        timeout: cdk.Duration.seconds(300),
        environment: {
          BUCKET_NAME: this.s3Bucket.bucketName,
        },
        role: new iam.Role(this, "InvokeExternalSagemakerEndpointRole", {
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
                  resources: [this.s3Bucket.bucketArn],
                }),
              ],
            }),
            ssmAccessPolicy: new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ["ssm:DescribeParameters", "ssm:GetParameter"],
                  resources: [parameterStoreSageMakerARNs, parameterSageMakerEndpoints],
                }),
              ],
            }),
          },
        }),
      }
    );


    // Add the Lambda function's ARN to AWS SSM Parameter Store
    const sagemakerLambdaARNParameter = new ssm.StringParameter(
      this,
      "InvokeExternalSagemakerEndpointLambdaFunctionArnParameter",
      {
        parameterName: "/app/nft/SagemakerEndpointLambdaFunctionArn",
        stringValue: invokeExternalSagemakerEndpointLambdaFunction.functionArn,
      }
    );

    // Grant the Lambda function full permissions to the S3 bucket
    this.s3Bucket.grantReadWrite(invokeExternalSagemakerEndpointLambdaFunction);
  }
}
