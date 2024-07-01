# Web3Workshop Parameter Stack

The project represents the parameter stack (module 0) for the AWS Web3Workshop. The project is implemented in AWS Cloud Development Kit (CDK) v2 and TypeScript.

## Web3Workshop Prerequisites
* Module **0**
* No dependencies

## Solution Overview
* CloudFormation parameters that can be specified during deploy time.
* SSM parameters that consume the CloudFormation parameters during deployment time to override the `default` values.

## Development 

* An [AWS account](https://signin.aws.amazon.com/signin?redirect_uri=https%3A%2F%2Fportal.aws.amazon.com%2Fbilling%2Fsignup%2Fresume&client_id=signup)
* An [AWS Identity and Access Management](http://aws.amazon.com/iam) (IAM) user with administrator access
* [Configured AWS credentials](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#getting_started_prerequisites)
* [Node.js](https://nodejs.org/en/download/)
  installed on the workstation that you plan to deploy the solution from.

### Deploy with AWS CDK
```shell
npm install -g aws-cdk && cdk –version
```

```shell
npm install
```

```shell
npx aws-cdk@2.x synth
```

```shell
npx aws-cdk@2.x deploy \n--parameters rpcEndpoint=https://my.rpc.node/<my_token> \n--parameters alchemyPolicyId=<policy_id> \n--parameters alchemyTestnetAPIKey=<my_api_key> \n--parameters nftStorageAPIToken=<nft_storage_token> \n--parameters paymasterEndpoint=<https://my.paymaster.com>
```

Example:
```shell
npx aws-cdk@2.x deploy \n--parameters rpcEndpoint=https://eth-sepolia.g.alchemy.com/v2/demo \n--parameters alchemyPolicyId=123456a7-ab12-1a23-a123-12a3bc45678d \n--parameters alchemyTestnetAPIKey=demo \n--parameters nftStorageAPIToken=1234567890abcdef \n--parameters paymasterEndpoint=https://eth-sepolia.g.alchemy.com/v2/demo
```


## CloudFormation Parameters

The following parameters can be propagated to the SSM Parameter Store during deployment time via `CfnParmaters`.
Parameters can be specified during deployment step via `--parameters <parmeterName>=<parameterValue>`.

<!-- TODO to be updated after module 1 has been finalized -->
* **alchemyPolicyId**: (required)
    * SSM parameter path: `/web3/aa/alchemy_policy_id`
* **alchemyTestnetAPIKey**: (required)
    * SSM parameter path: `/web3/aa/alchemy_api_key`
* **nftStorageAPIToken**: (required)
    * SSM parameter path: `/web3/nftstorage/apitoken`
* **sagemakerEndpointAPIURL**: (required)
    * SSM parameter path: `/app/sagemaker/endpoint/apiurl`
* **sagemakerEndpointAPIKEY**: (required)
    * SSM parameter path: `/app/sagemaker/endpoint/apikey`
* **rpcEndpoint**: (required)
    * SSM parameter path: `/web3/rpc_endpoint`
* **indexerEndpoint**: (optional)
    * SSM parameter path: `/web3/indexer_endpoint`

### Log Level
* Default `log_level`(**WARNING**) is being propagated under SSM path: `/app/log_level`


