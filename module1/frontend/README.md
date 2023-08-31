# Web3 Workshop Frontend Stack

This CDK project is meant for the frontend. It creates a CodeCommit repository and a CI/CD pipeline for deploying the frontend. The frontend code itself is initially committed from the `assets/assets.zip` file.

## Prerequisites

1. Module 0
2. All other sections of Module 1

## Dependencies

_This should be the last CDK stack deployed in Module 1 of the Web3 Workshop_

1. Web3WorkshopParametersStack
2. Web3WorkshopCognitoKMSStack
3. Web3WorkshopBlockchainTransactionLambdaStack
4. Web3WorkshopApiGatewayStack

## Solution Overview

- AWS Amplify to host the web app and automate the CI/CD pipeline to deploy it
- AWS CodeCommit repository to host frontend source code
- React single page web app source code written in TypeScript
  - The source code is located in `/assets/assets.zip`, its contents will be uploaded to the CodeCommit repository deployed by this project

## Development

### Prerequisites

- An [AWS account](https://signin.aws.amazon.com/signin?redirect_uri=https%3A%2F%2Fportal.aws.amazon.com%2Fbilling%2Fsignup%2Fresume&client_id=signup)
- An [AWS Identity and Access Management](http://aws.amazon.com/iam) (IAM) user with administrator access
- [Configured AWS credentials](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#getting_started_prerequisites)
- [Node.js](https://nodejs.org/en/download/)

### Getting started

Run the below commands to initialize your environment for development and deployment of this project:

```
npm install
```

### Deploy with AWS CDK

Run the below commands to deploy this project to AWS:

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
- After completion, the CodeCommit repository and Amplify App will be accessible in the AWS Console

## Build and Deploy Amplify App

Now that our infrastructure is deployed we can build and deploy or web app for the first time using AWS Amplify. To initiate a deployment of our web app we can make a commit to our CodeCommit repository and push it. Before we can commit to the repository we must clone it.

### Clone New Repository

CDK will output the clone URL for the repository. Use them to clone the newly created repository to your machine:

```
git clone <REPO URL from output of cdk deploy>
cd web3-workshop-frontend
```

_Can't find your CodeCommit clone URL?_ Find it on the [CodeCommit console](https://console.aws.amazon.com/codesuite/codecommit/repositories/)

### Making our first commit

In order to make a commit we must change some code. Let's update the version number of our app:

```
npm run version-bump-alpha
```

- This command will automatically update the `version` property of `package.json` and `package-lock.json` and commit the change

Now push the updated app version change to our CodeCommit repository to initiate the first Amplify app build and deployment:

```
git push
```

The last command will push the files to the remote CodeCommit repository. This will trigger the first build in Amplify. You can watch it by navigating to the [Amplify console](https://console.aws.amazon.com/amplify/home).
