#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const cdk = require('aws-cdk-lib')
const { TheGraphServiceStack } = require('../lib/the_graph-service-stack')
const { AwsSolutionsChecks } = require('cdk-nag')
const { StringParameter } = require('aws-cdk-lib/aws-ssm')

const app = new cdk.App()

// const logLevel = StringParameter.valueForStringParameter(this, '/app/log_level')
// const allowedSG = StringParameter.valueForStringParameter( this, '/app/cloud9_sg' )
// const clientUrl = StringParameter.valueForStringParameter( this, '/web3/rpc_endpoint' )
// // we are using valueFromLookup instead of valueForStringParameter because
// // valueForStringParameter doesn't retrieve the value until deployment. We
// // need it at synth time already, because we are using it as key in the map.
// const chainId = parseInt( StringParameter.valueFromLookup(this, '/web3/chain_id') )

// the following values are used in the context of this stack only. No need to externalize them to ParameterStore
const allowedIP = app.node.tryGetContext('allowedIP')
const graphInstanceType =
  app.node.tryGetContext('graphInstanceType') || 't3a.xlarge'

const graphStack = new TheGraphServiceStack(app, 'Web3WorkshopTheGraphServiceStack', {
  env: {
    account: process.env.CDK_DEPLOY_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  // logLevel,
  // clientUrl,
  // chainId,
  graphInstanceType,
  allowedIP,
  // allowedSG,
})

cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))
