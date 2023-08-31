// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";

export class Web3WorkshopApiGatewayStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Gets the NFT Lambda function to process NFT requests
    const lambda_blockchain_handler = lambda.Function.fromFunctionAttributes(
      this,
      "lambda_rpc",
      {
        functionArn: ssm.StringParameter.valueForStringParameter(
          this,
          "/app/nft/lambda_arn"
        ),
        sameEnvironment: true,
      }
    );

    // Gets the Cognito UserPool
    const userpool = cognito.UserPool.fromUserPoolId(
      this,
      "userpool",
      ssm.StringParameter.valueForStringParameter(
        this,
        "/app/cognito/user_pool_id"
      )
    );

    // Creates the Cognito UserPool Authorizer
    const auth = new apigw.CognitoUserPoolsAuthorizer(this, "Authorizer", {
      cognitoUserPools: [userpool],
      authorizerName: "Web3WorkshopAuthorizer",
    });

    // Log group for API Gateway
    const logGroup = new logs.LogGroup(this, "LogGroup", {
      logGroupName:
        "APIGW-Web3Workshop-Execution-Logs-" +
        (Math.random() + 1).toString(36).substring(7),
      retention: logs.RetentionDays.ONE_MONTH,
    });

    // Creates Rest API
    const api = new apigw.RestApi(this, "RestApi", {
      restApiName: "Web3WorkshopAPI",
      description: "Web3 Workshop API",
      cloudWatchRole: true,
      defaultMethodOptions: {
        authorizer: auth,
        authorizationType: apigw.AuthorizationType.COGNITO,
      },
      deployOptions: {
        stageName: "main",
        methodOptions: {
          "/*/*": {
            loggingLevel: apigw.MethodLoggingLevel.INFO,
            dataTraceEnabled: true,
          },
        },
        accessLogDestination: new apigw.LogGroupLogDestination(logGroup),
        accessLogFormat: apigw.AccessLogFormat.jsonWithStandardFields({
          caller: false,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
      },
      defaultCorsPreflightOptions: {
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
        ],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: apigw.Cors.ALL_ORIGINS,
      },
    });

    // Add /tokens root resource
    const tokens = api.root.addResource("tokens");

    // Add /tokens/{collection} resource
    const collection = tokens.addResource("{collection}");
    collection.addMethod(
      "GET",
      new apigw.LambdaIntegration(lambda_blockchain_handler),
      {
        authorizer: auth,
        authorizationType: apigw.AuthorizationType.COGNITO,
      }
    ); // GET /tokens/{collection}
    collection.addMethod(
      "POST",
      new apigw.LambdaIntegration(lambda_blockchain_handler),
      {
        authorizer: auth,
        authorizationType: apigw.AuthorizationType.COGNITO,
      }
    ); // POST /tokens/{collection}

    // Add /tokens/{collection}/{tokenId} resource
    const collectionid = collection.addResource("{tokenId}");
    collectionid.addMethod(
      "GET",
      new apigw.LambdaIntegration(lambda_blockchain_handler),
      {
        authorizer: auth,
        authorizationType: apigw.AuthorizationType.COGNITO,
      }
    ); // GET /tokens/{collection}/{id}
    collectionid.addMethod(
      "PATCH",
      new apigw.LambdaIntegration(lambda_blockchain_handler),
      {
        authorizer: auth,
        authorizationType: apigw.AuthorizationType.COGNITO,
      }
    ); // PATCH /tokens/{collection}/{id}
    collectionid.addMethod(
      "DELETE",
      new apigw.LambdaIntegration(lambda_blockchain_handler),
      {
        authorizer: auth,
        authorizationType: apigw.AuthorizationType.COGNITO,
      }
    ); // DELETE /tokens/{collection}/{id}

    // user-op Resource to get transaction hash of a user op hash
    const userOpResource = api.root.addResource("user-op");
    const userOpStatusResource = userOpResource
      .addResource("{userOpHash}")
      .addResource("transaction-hash");

    userOpStatusResource.addMethod(
      "GET",
      new apigw.LambdaIntegration(lambda_blockchain_handler)
    ); // GET /user-op/{userOpHash}/transaction-hash

    // Grant permission to Lambda function to be called by APIGW
    const principal = new iam.ServicePrincipal("apigateway.amazonaws.com");
    lambda_blockchain_handler.grantInvoke(principal);

    // Add API Gateway Domain to SSM for front end
    const apiGatewayDomain = api.url;

    new ssm.StringParameter(this, "apiGatewayInvokeUrlSSMParameter", {
      stringValue: apiGatewayDomain,
      parameterName: "/app/api_gateway/invoke_url",
    });

    new cdk.CfnOutput(this, "APIEndpoint", {
      value: apiGatewayDomain,
      description: "API Gateway Endpoint",
    });

    // apigateway id to parameter store as /app/api_gateway/id
    new ssm.StringParameter(this, "apiGatewayIdSSMParameter", {
      stringValue: api.restApiId,
      parameterName: "/app/api_gateway/id",
      description: "API Gateway ID",
    });

    // apigateway root resource to parameter store as /app/api_gateway/root_resource_id
    new ssm.StringParameter(this, "apiGatewayRootResourceIdSSMParameter", {
      stringValue: api.restApiRootResourceId,
      parameterName: "/app/api_gateway/root_resource_id",
      description: "API Gateway Root Resource ID",
    });

    // apigateway 'tokens' resource to parameter store as /app/api_gateway/tokens_resource_id
    new ssm.StringParameter(this, "apiGatewayTokenResourceIdSSMParameter", {
      stringValue: tokens.resourceId,
      parameterName: "/app/api_gateway/tokens_resource_id",
      description: "API Gateway Tokens Resource ID",
    });
  }
}
