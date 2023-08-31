// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const { App, CodeCommitSourceCodeProvider, RedirectStatus } = require('@aws-cdk/aws-amplify-alpha');
const { Stack, CfnOutput } = require('aws-cdk-lib');
const { Repository, Code } = require('aws-cdk-lib/aws-codecommit');
const { BuildSpec } = require('aws-cdk-lib/aws-codebuild');

const ssm = require('aws-cdk-lib/aws-ssm');

class FrontEndStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create CodeCommit repository
    const repository = new Repository(this, 'RepoWeb3WorkshopFrontend', {
      repositoryName: 'web3-workshop-frontend',
      code: Code.fromZipFile('assets/assets.zip')
    });

    // Get values from Parameter Store and add them as Amplify Environment Variables

    // Backend region

    const backendRegion = ssm.StringParameter.valueForStringParameter(this, '/app/region');

    // Cognito

    const ssmKeyPrefixCognito = '/app/cognito';
    const cognitoUserPoolId = ssm.StringParameter.valueForStringParameter(
      this,
      `${ssmKeyPrefixCognito}/user_pool_id`
    );

    const cognitoUserPoolAppClientId = ssm.StringParameter.valueForStringParameter(
      this,
      `${ssmKeyPrefixCognito}/app_client_id`
    );

    // API Gateway

    const apiGatewayDomain = ssm.StringParameter.valueForStringParameter(
      this,
      '/app/api_gateway/invoke_url'
    );

    // NFT Collection contract addresses

    const nftContractAddressSentences = ssm.StringParameter.valueForStringParameter(
      this,
      '/web3/contracts/erc721/sentences/address'
    );

    const nftContractAddressGenAi = ssm.StringParameter.valueForStringParameter(
      this,
      '/web3/contracts/erc721/genai/address'
    );

    // BuildSpec for Amplify App

    const buildSpec = BuildSpec.fromObject({
      frontend: {
        phases: {
          preBuild: { commands: ['npm ci'] },
          build: { commands: ['npm run build'] }
        },
        artifacts: {
          baseDirectory: '/dist',
          files: ['**/*']
        },
        cache: {
          paths: ['/node_modules/**/*']
        }
      }
    });

    // Create Amplify app based on the repository and set environment variables
    const amplifyApp = new App(this, 'AmplifyAppWeb3WorkshopFrontend', {
      sourceCodeProvider: new CodeCommitSourceCodeProvider({ repository }),
      buildSpec,
      environmentVariables: {
        VITE_REGION: backendRegion,
        VITE_USER_POOL_ID: cognitoUserPoolId,
        VITE_USER_POOL_WEB_CLIENT_ID: cognitoUserPoolAppClientId,
        VITE_API_GATEWAY_DOMAIN: apiGatewayDomain,
        VITE_CONTRACT_ADDRESS_SENTENCE_NFT: nftContractAddressSentences,
        VITE_CONTRACT_ADDRESS_GENAI_NFT: nftContractAddressGenAi,
        VITE_COLLECTION_NAME_SENTENCE_NFT: 'sentences',
        VITE_COLLECTION_NAME_GENAI_NFT: 'genai',
        VITE_URL_WORKSHOP: 'https://catalog.workshops.aws/buildweb3'
      }
    });

    // Setup Amplify pipeline to build and deploy commits to the 'main' branch
    amplifyApp.addBranch('main');

    // Add an Amplify Rewrite rule to return our single page web app for any request that is not for static resources.
    // This is needed because our web app utilizes client side routing.
    amplifyApp.addCustomRule({
      source:
        '</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>',
      target: '/index.html',
      status: RedirectStatus.REWRITE
    });

    // Output the clone URLs of the CodeCommit repo
    new CfnOutput(this, 'FrontendCodeCommitCloneUrlHttp', {
      value: repository.repositoryCloneUrlHttp
    });
    new CfnOutput(this, 'FrontendCodeCommitCloneUrlGRC', {
      value: repository.repositoryCloneUrlGrc
    });
  }
}

module.exports = { FrontEndStack };
