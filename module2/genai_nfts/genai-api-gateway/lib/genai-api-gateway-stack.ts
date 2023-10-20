// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
const {
  RestApi,
  Resource,
  Integration,
  Deployment,
  IntegrationType,
  PassthroughBehavior,
} = require("aws-cdk-lib/aws-apigateway");
const { StringParameter } = require("aws-cdk-lib/aws-ssm");
import * as iam from "aws-cdk-lib/aws-iam";
import { SFNWorkflowConstruct } from "./sfn-workflow-stack";

export class GenaiApiGatewayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // get 	/app/api_gateway/id from SSM parameter store
    const apiGwId = StringParameter.valueForStringParameter(
      this,
      "/app/api_gateway/id"
    );

    const rootResourceId = StringParameter.valueForStringParameter(
      this,
      "/app/api_gateway/root_resource_id"
    );

    const tokensResourceId = StringParameter.valueForStringParameter(
      this,
      "/app/api_gateway/tokens_resource_id"
    );

    // get APIGW from apiGwId
    const apigw = RestApi.fromRestApiAttributes(this, "api-gateway", {
      restApiId: apiGwId,
      rootResourceId: rootResourceId,
    });

    // Add StepFunction for GenAI NFTs
    // Create the StepFunction workflow and StateMachine to generate images
    const sfnGenAIConstruct = new SFNWorkflowConstruct(
      this,
      "ImageGenWorkflowX",
      {
        WorkflowName: "ImageGenWorkflowX",
        ImageGenLambdaArn: StringParameter.valueForStringParameter(
          this,
          "/app/nft/ImageGenerationLambdaFunctionArn"
        ),
        IPFSPublishLambdaArn: StringParameter.valueForStringParameter(
          this,
          "/app/nft/IPFSLambdaARNParameter"
        ),
        MintNFTLambdaArn: StringParameter.valueForStringParameter(
          this,
          "/app/nft/lambda_arn"
        ),
      }
    );

    const invokeSFNAPIRole = new iam.Role(this, "invokeSFNAPIRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      inlinePolicies: {
        allowSFNInvoke: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["states:StartExecution", "states:DescribeExecution"],
              resources: [sfnGenAIConstruct.stateMachine.stateMachineArn],
            }),
          ],
        }),
      },
    });

    const describeSFNExecutionAPIRole = new iam.Role(
      this,
      "describeSFNExecutionAPIRole",
      {
        assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      }
    );

    sfnGenAIConstruct.stateMachine.grantExecution(
      describeSFNExecutionAPIRole,
      "states:DescribeExecution"
    );

    const tokensResource = Resource.fromResourceAttributes(
      this,
      "ScreenResource",
      {
        restApi: apigw,
        resourceId: tokensResourceId,
        path: "/tokens",
      }
    );

    const genai = new Resource(this, "genaiResource", {
      parent: tokensResource,
      pathPart: "genai",
    });

    const sfnName = sfnGenAIConstruct.stateMachine.stateMachineName;

    // Adds method that integrates with Step Function State Machine
    genai.addMethod(
      "POST",
      new Integration({
        type: IntegrationType.AWS,
        integrationHttpMethod: "POST",
        uri: `arn:aws:apigateway:${cdk.Aws.REGION}:states:action/StartExecution`,
        options: {
          credentialsRole: invokeSFNAPIRole,
          passthroughBehavior: PassthroughBehavior.NEVER,
          requestTemplates: {
            "application/json": `{
              "stateMachineArn":"$util.escapeJavaScript('arn:aws:states:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:stateMachine:${sfnName}')",
              "input":"{\\"ImageRequest\\": { \\"prompt\\":\\"$util.escapeJavaScript($input.path('$.prompt'))\\", \\"jwt\\":\\"$util.escapeJavaScript($input.params('Authorization'))\\"}}"
            }`,
          },
          integrationResponses: [
            {
              selectionPattern: "200",
              statusCode: "200",
              responseTemplates: {
                "application/json": `
                $input.body
              `,
              },
              responseParameters: {
                "method.response.header.Access-Control-Allow-Methods":
                  "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
                "method.response.header.Access-Control-Allow-Headers":
                  "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
                "method.response.header.Access-Control-Allow-Origin": "'*'",
              },
            },
            {
              selectionPattern: "4[0-9]{2}",
              statusCode: "400",
              responseTemplates: {
                "application/json": `
                $input.body
              `,
              },
              responseParameters: {
                "method.response.header.Access-Control-Allow-Methods":
                  "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
                "method.response.header.Access-Control-Allow-Headers":
                  "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
                "method.response.header.Access-Control-Allow-Origin": "'*'",
              },
            },
            {
              selectionPattern: "5[0-9]{2}",
              statusCode: "500",
              responseTemplates: {
                "application/json": `
                $input.body
              `,
              },
              responseParameters: {
                "method.response.header.Access-Control-Allow-Methods":
                  "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
                "method.response.header.Access-Control-Allow-Headers":
                  "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
                "method.response.header.Access-Control-Allow-Origin": "'*'",
              },
            },
          ],
        },
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
            // Allows the following `responseParameters` be specified in the `integrationResponses` section.
            responseParameters: {
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Headers": true,
              "method.response.header.Access-Control-Allow-Origin": true,
            },
          },
          {
            statusCode: "400",
            // Allows the following `responseParameters` be specified in the `integrationResponses` section.
            responseParameters: {
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Headers": true,
              "method.response.header.Access-Control-Allow-Origin": true,
            },
          },
          {
            statusCode: "500",
            // Allows the following `responseParameters` be specified in the `integrationResponses` section.
            responseParameters: {
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Headers": true,
              "method.response.header.Access-Control-Allow-Origin": true,
            },
          },
        ],
      }
    ); // POST /tokens/genai

    // Add /tokens/status/{executionArn} resource

    const status = new Resource(this, "statusResource", {
      parent: tokensResource,
      pathPart: "status",
    });

    const executionArn = status.addResource("{executionArn}");
    executionArn.addMethod(
      "GET",
      new Integration({
        type: IntegrationType.AWS,
        integrationHttpMethod: "POST",
        uri: `arn:aws:apigateway:${cdk.Aws.REGION}:states:action/DescribeExecution`,
        options: {
          credentialsRole: describeSFNExecutionAPIRole,
          passthroughBehavior: PassthroughBehavior.NEVER,
          requestTemplates: {
            "application/json": `{"executionArn":"$util.urlDecode($util.escapeJavaScript($input.params('executionArn')))"}`,
          },
          integrationResponses: [
            {
              selectionPattern: "200",
              statusCode: "200",
              responseTemplates: {
                "application/json": `
                $input.body
              `,
              },
              responseParameters: {
                "method.response.header.Access-Control-Allow-Methods":
                  "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
                "method.response.header.Access-Control-Allow-Headers":
                  "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
                "method.response.header.Access-Control-Allow-Origin": "'*'",
              },
            },
            {
              selectionPattern: "4[0-9]{2}",
              statusCode: "400",
              responseTemplates: {
                "application/json": `
                $input.body
              `,
              },
              responseParameters: {
                "method.response.header.Access-Control-Allow-Methods":
                  "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
                "method.response.header.Access-Control-Allow-Headers":
                  "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
                "method.response.header.Access-Control-Allow-Origin": "'*'",
              },
            },
            {
              selectionPattern: "5[0-9]{2}",
              statusCode: "500",
              responseTemplates: {
                "application/json": `
                $input.body
              `,
              },
              responseParameters: {
                "method.response.header.Access-Control-Allow-Methods":
                  "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
                "method.response.header.Access-Control-Allow-Headers":
                  "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
                "method.response.header.Access-Control-Allow-Origin": "'*'",
              },
            },
          ],
        },
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
            // Allows the following `responseParameters` be specified in the `integrationResponses` section.
            responseParameters: {
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Headers": true,
              "method.response.header.Access-Control-Allow-Origin": true,
            },
          },
          {
            statusCode: "400",
            // Allows the following `responseParameters` be specified in the `integrationResponses` section.
            responseParameters: {
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Headers": true,
              "method.response.header.Access-Control-Allow-Origin": true,
            },
          },
          {
            statusCode: "500",
            // Allows the following `responseParameters` be specified in the `integrationResponses` section.
            responseParameters: {
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Headers": true,
              "method.response.header.Access-Control-Allow-Origin": true,
            },
          },
        ],
      }
    ); // GET /tokens/status/{executionArn}

    const genAIRoutesDeployment = new Deployment(
      this,
      "ApiGatewayGenAIRoutesDeployment",
      {
        api: apigw,
        description: "Deploy the GenAI endpoint",
      }
    );

    // https://stackoverflow.com/questions/63950199/how-to-use-an-existing-stage-in-api-gateway-deployments-in-aws-cdk/64369331#64369331
    // https://github.com/aws/aws-cdk/issues/25582
    (genAIRoutesDeployment as any).resource.stageName = "main";
  }
}
