// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as logs from "aws-cdk-lib/aws-logs";

export interface SFNWorkflowConstructProps {
  WorkflowName: string;
  SagemakerImageGenLambdaArn: string;
  IPFSPublishLambdaArn: string;
  MintNFTLambdaArn: string;
}

// Define retry configuration for SagemakerImageGenLambdaTask
const retryConfigurationForSagemakerImageGen = {
  errors: ["States.ALL"],
  interval: cdk.Duration.seconds(12),
  maxAttempts: 4,
  backoffRate: 2,
};
export class SFNWorkflowConstruct extends Construct {
  public readonly stateMachine: StateMachine;

  constructor(scope: Construct, id: string, props: SFNWorkflowConstructProps) {
    super(scope, id);

    // First Lambda SagemakerImageGenLambda
    const SagemakerImageGenLambdaFunction = lambda.Function.fromFunctionArn(
      this,
      "SagemakerImageGenLambda",
      props.SagemakerImageGenLambdaArn
    );
    const SagemakerImageGenLambdaTask = new LambdaInvoke(
      this,
      "SagemakerImageGenLambdaTask",
      {
        lambdaFunction: SagemakerImageGenLambdaFunction,
        payload: sfn.TaskInput.fromObject({
          prompt: sfn.JsonPath.stringAt("$.prompt"),
          jwt: sfn.JsonPath.stringAt("$.jwt"),
        }),
        inputPath: "$.ImageRequest",
        resultSelector: {
          "BucketUrl.$": "$.Payload.body.s3_urls[0]",
          "ownerAddress.$": "$.Payload.body.ownerAddress",
          "walletAddress.$": "$.Payload.body.walletAddress",
          "userKeyId.$": "$.Payload.body.userKeyId",
          "sub.$": "$.Payload.body.sub",
          "prompt.$": "$.Payload.body.prompt",
        },
      }
    );

    SagemakerImageGenLambdaTask.addRetry(retryConfigurationForSagemakerImageGen)
    // Second Lambda IPFSPublishLambda
    const IPFSPublishLambdaFunction = lambda.Function.fromFunctionArn(
      this,
      "IPFSPublishLambda",
      props.IPFSPublishLambdaArn
    );
    const IPFSPublishLambdaTask = new LambdaInvoke(
      this,
      "IPFSPublishLambdaTask",
      {
        lambdaFunction: IPFSPublishLambdaFunction,
        payload: sfn.TaskInput.fromObject({
          "ImagePrompt.$": "$.prompt",
          "BucketUrl.$": "$.BucketUrl",
          "walletAddress.$": "$.walletAddress",
          "ownerAddress.$": "$.ownerAddress",
          "userKeyId.$": "$.userKeyId",
          "sub.$": "$.sub",
        }),
        resultSelector: {
          "metadataURI.$": "$.Payload.body.metadataURI",
          "walletAddress.$": "$.Payload.body.walletAddress",
          "ownerAddress.$": "$.Payload.body.ownerAddress",
          "userKeyId.$": "$.Payload.body.userKeyId",
          "sub.$": "$.Payload.body.sub",
        },
      }
    );

    // Third Lambda MintNFTLambda
    const MintNFTLambdaFunction = lambda.Function.fromFunctionArn(
      this,
      "MintNFTLambda",
      props.MintNFTLambdaArn
    );
    const MintNFTLambdaTask = new LambdaInvoke(this, "MintNFTLambdaTask", {
      lambdaFunction: MintNFTLambdaFunction,
      payload: sfn.TaskInput.fromObject({
        "metadataURI.$": "$.metadataURI",
        contractType: "ERC721",
        nftCollectionName: "genai",
        invocationFunction: "mint",
        "walletAddress.$": "$.walletAddress",
        "ownerAddress.$": "$.ownerAddress",
        "userKeyId.$": "$.userKeyId",
        "sub.$": "$.sub",
      }),
      resultPath: "$.MintNFTResult",
      resultSelector: {
        "StatusCode.$": "$.Payload.statusCode",
        "TxnHash.$": "$.Payload.body",
      },
    });
    const definition = sfn.Chain.start(SagemakerImageGenLambdaTask)
      .next(IPFSPublishLambdaTask)
      .next(MintNFTLambdaTask);


    // Step Function Workflow
    const logGroup = new logs.LogGroup(this, "ImageGenWorkflowXLogGroup", {
      logGroupName: "/aws/vendedlogs/states/ImageGenWorkflowXgGroup",
      removalPolicy: cdk.RemovalPolicy.DESTROY
    }
    );

    this.stateMachine = new StateMachine(this, props.WorkflowName, {
      definition,
      timeout: cdk.Duration.seconds(300),
      logs: {

        destination: logGroup,
        level: sfn.LogLevel.ALL,
      },
    });

    // Output the State Machine ARN
    new cdk.CfnOutput(this, "StateMachineArn", {
      value: this.stateMachine.stateMachineArn,
    });
  }
}
