// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const { Stack, Duration } = require("aws-cdk-lib");
const {
  RestApi,
  LambdaIntegration,
  Cors,
} = require("aws-cdk-lib/aws-apigateway");
const { PolicyStatement, Effect } = require("aws-cdk-lib/aws-iam");
const { Runtime } = require("aws-cdk-lib/aws-lambda");
const { NodejsFunction } = require("aws-cdk-lib/aws-lambda-nodejs");
const { StringParameter } = require("aws-cdk-lib/aws-ssm");
const path = require("path");

class ChainqueryStack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    // create a nodejs lambda function
    const lambda = new NodejsFunction(this, "chainquery-lambda", {
      entry: path.join(__dirname, "src/", "queryTx.js"),
      timeout: Duration.seconds(30),
      memorySize: 256,
      runtime: Runtime.NODEJS_18_X,
    });

    // add policy to allow lambda to call dynamodb
    lambda.addToRolePolicy(
      new PolicyStatement({
        actions: ["managedblockchain-query:*"],
        resources: ["*"],
        effect: Effect.ALLOW,
      })
    );

    // get 	/app/api_gateway/id from SSM parameter store
    const apiGwId = StringParameter.valueForStringParameter(
      this,
      "/app/api_gateway/id"
    );

    const rootResourceId = StringParameter.valueForStringParameter(
      this,
      "/app/api_gateway/root_resource_id"
    );

    // get APIGW from apiGwId
    const apiGw = RestApi.fromRestApiAttributes(this, "api-gateway", {
      restApiId: apiGwId,
      rootResourceId: rootResourceId,
    });

    const transactions = apiGw.root.addResource("transactions", {
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
      },
    });

    transactions.addMethod("GET", new LambdaIntegration(lambda));
  }
}

module.exports = { ChainqueryStack };
