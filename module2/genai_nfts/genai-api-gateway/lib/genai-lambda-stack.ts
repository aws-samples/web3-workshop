// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as assets from "aws-cdk-lib/aws-s3-assets"
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

export class GenAILambdaStack extends Stack {
  readonly s3Bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    
    const pythonRuntime = lambda.Runtime.PYTHON_3_11;
    const architecture = lambda.Architecture.X86_64;
    
    const ecrBaseImage = pythonRuntime.bundlingImage.image + `:latest-${architecture.toString()}`
    
    const bundlingOption: cdk.BundlingOptions = {
      image: new cdk.DockerImage(ecrBaseImage),
      command:[
        "bash",
        "-c",
        "pip install -r requirements.txt -t /asset-output/python",
      ],
      outputType:cdk.BundlingOutput.AUTO_DISCOVER,
      platform:architecture.dockerPlatform,
      network:"host"
    }
    
    const bedrockLayerAsset = new assets.Asset(
      this,
      "BedrockCompatibleBoto3Asset",
      {
        path: "./layers/boto3BedrockCompatible",
        bundling: bundlingOption
      }
    )
    
    const bedrockCompatibleBoto3 = new lambda.LayerVersion(
      this,
      "BedrockCompatibleBoto3Layer",
      {
        compatibleRuntimes:[pythonRuntime],
        compatibleArchitectures: [architecture],
        code: lambda.Code.fromBucket(bedrockLayerAsset.bucket, bedrockLayerAsset.s3ObjectKey),
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        description: "Boto3 version that is Amazon Bedrock compatible."
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


    const modelId = "stability.stable-diffusion-xl-v0";
    const bedrockStableDiffusionArn =  `arn:aws:bedrock:${this.region}::foundation-model/${modelId}`;
    
    const invokeBedrockFoundationModelLambdaFunction = new PythonFunction(
      this,
      "InvokeBedrockFoundationModel",
      {
        runtime: pythonRuntime,
        architecture: architecture,
        entry: "lambda/InvokeBedrockLambdaAssets",
        index: "InvokeBedrockModel.py",
        handler: "lambda_handler",
        layers: [bedrockCompatibleBoto3],
        timeout: cdk.Duration.seconds(300),
        environment: {
          BUCKET_NAME: this.s3Bucket.bucketName,
          BEDROCK_MODEL_ID: modelId
        },
        role: new iam.Role(this, "InvokeBedrockFoundationModelRole", {
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
            bedrockAccessPolicy: new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ["bedrock:InvokeModel"],
                  resources: [bedrockStableDiffusionArn],
                }),
              ],
            }),
          },
        }),
      }
    );


    // Add the Lambda function's ARN to AWS SSM Parameter Store
    const bedrockLambdaARNParameter = new ssm.StringParameter(
      this,
      "InvokeBedrockFoundationModelLambdaFunctionArnParameter",
      {
        parameterName: "/app/nft/ImageGenerationLambdaFunctionArn",
        stringValue: invokeBedrockFoundationModelLambdaFunction.functionArn,
      }
    );

    // Grant the Lambda function full permissions to the S3 bucket
    this.s3Bucket.grantReadWrite(invokeBedrockFoundationModelLambdaFunction);
  }
}
