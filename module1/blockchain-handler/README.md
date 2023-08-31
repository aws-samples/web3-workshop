# Blockchain Lambda CDK

This project contains a CDK Stack with a Lambda function that handles all blockchain operations in the Web3 on AWS Workshop. This includes minting, transferring, burning, and querying NFTs. The Lambda utilizes ERC-4337 Account Abstraction so users do not need to bring their own wallet.

## Prerequisites

1. Module 0

## Dependencies

1. Web3Workshop Parameter Stack: https://gitlab.aws.dev/blockchain-tfc/web3workshop-parameters

## Solution Overview

- AWS Lambda invoked by API Gateway on the routes to mint, burn, transfer, and get NFTs
- NFTs minted, burnt, and transferred using [ERC-4337 Account Abstraction](https://www.alchemy.com/overviews/what-is-account-abstraction)
- Module 1 NFTs queried directly from the Ethereum Goerli network using the [ethers.js](https://github.com/ethers-io/ethers.js/) library
- Module 2 NFTs queried using The Graph

## Development

### Prerequisites

- An [AWS account](https://signin.aws.amazon.com/signin?redirect_uri=https%3A%2F%2Fportal.aws.amazon.com%2Fbilling%2Fsignup%2Fresume&client_id=signup)
- An [AWS Identity and Access Management](http://aws.amazon.com/iam) (IAM) user with administrator access
- [Configured AWS credentials](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#getting_started_prerequisites)
- [Docker](https://docs.docker.com/get-docker/), [Node.js](https://nodejs.org/en/download/), and the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
  installed on the workstation that you plan to deploy the solution from.

### Getting started

Run the below commands to initialize your environment for development and deployment of this project:

```
npm install
```

- Installs project dependencies

```
npx cdk synth
```

- Generates the CloudFormation templates from this project's CDK code

### Testing

Test the Lambda function locally with the AWS SAM CLI

- Test JSON events are located in this project directory: `/test/events`
- AWS SAM can be used to invoke the Lambda function locally, passing the test JSON events

```
sam local invoke -t ./cdk.out/Web3WorkshopBlockchainTransactionLambdaStack.template.json BlockchainTransactionManager -e test/events/<test file name>.json --env-vars test/env.json
```

For example, to test querying NFTs from the Sentences contract:

```
sam local invoke -t ./cdk.out/Web3WorkshopBlockchainTransactionLambdaStack.template.json BlockchainTransactionManager -e test/events/testQuerySentencesAll.json --env-vars test/env.json
```

**NOTE**: If changes to the Lambda code are made, the `npx cdk synth` command must be ran before calling the `sam local invoke` command to test the changes.

### ERC721 Test Invocations

Expects an object like this:

```
{
    contractType: string,
    ownerAddress: string,
    nftCollectionName: string,
    invocationFunction: string,
    tokenId?: string,
    toAddress?: string,
    metadataURI?: string,
    userKeyId?: string,
}
```

where:

- `contractType` is `ERC721`
- `ownerAddress` is the caller's address
- `nftCollectionName` is one of `['sentences', 'genai']`
- `invocationFunction` is one of `['mint', 'burn', 'transfer', 'query']`
- `tokenId` is specified for `['burn', 'transfer', 'query']`
- `toAddress` is specified for `['mint', 'transfer']`
- `metadataURI` is specified for `ERC721` invocations
- `userKeyId` is the keyId tied to the Cognito user
- `queryType` is specified if `invocationFunction` is `query` and is one of `['queryGetAll', 'queryGetAllForWallet', 'queryGetDetail']`
- `queryPageNumber` is specified if `invocationFunction` is `query` and `queryType` is `queryGetAll`
- `queryWalletAddress` is specified if `invocationFunction` is `query` and `queryType` is `queryGetAllForWallet`

### Deploy with AWS CDK

```
npx cdk bootstrap
```

- If you already ran this command you don't need to run it again
- This command only needs to be ran **once** in an account
- _You probably already ran this command in a previous Workshop step_

```
npx cdk synth
```

- Generates the CloudFormation templates from this project's CDK code

```
npx cdk deploy
```

- Deploys the Stack
- After completion, the Lambda function will be visible in the AWS Console

## SSM Parameters

The following AWS Systems Manager parameters will be stored in the Parameter Store:

1. Lambda function ARN

- Parameter path: `/app/nft/lambda_arn`
- Used by the API Gateway Stack to setup a LambdaIntegration on each NFT endpoint
