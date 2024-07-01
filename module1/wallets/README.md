# Web3Workshop Cognito KMS Stack

The project represents the foundation (module 1) for the AWS Web3Workshop. The project is implemented in AWS Cloud
Development Kit (CDK) v2 and Python.

## Web3Workshop Prerequisites

* Module **1**
* Dependencies:
    * Web3Workshop Parameter Stack: https://gitlab.aws.dev/blockchain-tfc/web3workshop-parameters

## To be done

List of required changes/optimizations:

1. ~~Carve out parameter stack (required)~~
2. ~~Remove `rpcUrl` as a required parameter (tbd)~~
3. ~~Rename stack~~
4. ~~API Gateway for signing (optional)~~
5. Still many todos in the code... (tbd)

## Solution Overview

* AWS Cognito for user sign-up and sign-in
* KMS for key derivation and encryption of envelope encryption
* DynamoDB for blockchain key management
* Central config propagation via SSM config parameter
* Stepfunction to manage KMS keys and Cognito sub to key_id mapping
* Lambda functions for AA calculations and signing functionality

## Development

### Prerequisites

*
An [AWS account](https://signin.aws.amazon.com/signin?redirect_uri=https%3A%2F%2Fportal.aws.amazon.com%2Fbilling%2Fsignup%2Fresume&client_id=signup)
* An [AWS Identity and Access Management](http://aws.amazon.com/iam) (IAM) user with administrator access
* [Configured AWS credentials](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#getting_started_prerequisites)
* [Docker](https://docs.docker.com/get-docker/), [Node.js](https://nodejs.org/en/download/)
  , [Python 3.9](https://www.python.org/downloads/release/python-3916)
  and [pip](https://pip.pypa.io/en/stable/installing/),
  installed on the workstation that you plan to deploy the solution from.

### Deploy with AWS CDK

* virtual environments ([venv](https://docs.python.org/3/library/venv.html#module-venv)) are recommended working with
  Python
* AWS CDK per default leverages virtual
  environments. [See how to activate virtualenv](https://cdkworkshop.com/30-python/20-create-project/200-virtualenv.html)

   ```shell
   npm install -g aws-cdk && cdk –version
   ```

To deploy the **development** version (cryptographic attestation turned off) of the sample application please follow the
steps below:

1. Install the AWS CDK and test the AWS CDK CLI:

   ```shell
   npm install -g aws-cdk && cdk –version
   ```

2. Clone the repository

   ```shell
   git clone git@ssh.gitlab.aws.dev:blockchain-tfc/web3workshop-cognito-kms.git
   ```

3. Change into the folder

   ```shell
   cd web3workshop-cognito-kms
   ```

4. Make sure your `virtualenv` is activated and install the dependencies using Python package manager:

   ```shell
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```

5. Deploy the workshop foundation using AWS CDK cli. A valid `rpcEndpoint` parameter, for example, pointing to an Amazon
   Managed Blockchain

   ```
   cdk deploy
   ```

## User Signup
To sign up and sign in with a user execute the following script and provide a valid email address for validation purpose.
Ensure that your `aws cli` credentials are valid and have not been expired otherwise the script will fail.
```shell
./scripts/create_identity.sh john.doe@example.com
```

The script will run a sign-up task. Please be aware that it can take several minutes till
the confirmation code arrives via email. The prompt will wait until you type the confirmation code.

Use the password along with your email address to get a valid jwt token.

```shell
./scripts/get_jwt.sh john.doe@example.com <my_email_confirmation_code>
{
  "account_address": "0x4159186832d06a97732c6c25bA8bF58F46E457f4",
  "aud": "2oh22e7oevj7sfm0ubbd7sm22b",
  "auth_time": 1687858676,
  "backend": "kms",
  "cognito:username": "d68c6123-f123-4123-a123-b0fb8ac6cfff",
  "email": "john.doe@example.com",
  "email_verified": true,
  "event_id": "fcba57b8-b845-421d-a7e8-994c6b8b9053",
  "exp": 1687862267,
  "iat": 1687858676,
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_AbCdEf123",
  "jti": "c9cf0f92-4ae4-4f9e-a8c3-22f0972542e3",
  "key_id": "809f78ea-c2ba-48ec-89fb-5b1ef9c98b48",
  "origin_jti": "ce88bdf4-239b-4077-9402-b2d61e80e303",
  "public_address": "0x950F572174cf111F4785F525603a5Ef19a2185F5",
  "sub": "d68c6b5b-f967-41b2-a3ad-b0fb8ac6caa8",
  "token_use": "id"
}
```


### JWT Token Spec

```json
{
  "account_address": "0x4159186832d06a97732c6c25bA8bF58F46E457f4",
  "aud": "2oh22e7oevj7sfm0ubbd7sm22b",
  "auth_time": 1687858676,
  "backend": "kms",
  "cognito:username": "d68c6123-f123-4123-a123-b0fb8ac6cfff",
  "email": "john.doe@example.com",
  "email_verified": true,
  "event_id": "fcba57b8-b845-421d-a7e8-994c6b8b9053",
  "exp": 1687862267,
  "iat": 1687858676,
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_AbCdEf123",
  "jti": "c9cf0f92-4ae4-4f9e-a8c3-22f0972542e3",
  "key_id": "809f78ea-c2ba-48ec-89fb-5b1ef9c98b48",
  "origin_jti": "ce88bdf4-239b-4077-9402-b2d61e80e303",
  "public_address": "0x950F572174cf111F4785F525603a5Ef19a2185F5",
  "sub": "d68c6b5b-f967-41b2-a3ad-b0fb8ac6caa8",
  "token_use": "id"
}
```

## Signing Requests

**Sign Tx**

```json
{
  "operation": "sign_tx",
  "tx_hash": "5033589a303c005b7e7818f4bf00e7361335f51f648be16c028951f90a1585d4",
  "key_id": "acb2ff44-db6a-4bf0-ad00-c499c64d676c",
  "sub": "68090fe5-1c30-4292-b92a-90e29afb35c4"
}
```

**Sign UserOp**

```json
{
  "operation": "sign_userop",
  "userop_hash": "5033589a303c005b7e7818f4bf00e7361335f51f648be16c028951f90a1585d4",
  "key_id": "acb2ff44-db6a-4bf0-ad00-c499c64d676c",
  "sub": "68090fe5-1c30-4292-b92a-90e29afb35c4"
}
```

## SSM Parameters

After a successful deployment of the stack two new SSM parameters will be propagated:

* **Deployment Region**
    * SSM parameter path: `/app/region`
    * Description: Required for [AWS Amplify](https://aws.amazon.com/amplify/) UI
* **Cognito Userpool ID**
    * SSM parameter path: `/app/cognito/user_pool_id`
    * Description: Required for [AWS Amplify](https://aws.amazon.com/amplify/) UI
* **Cognito App Client ID**
    * SSM parameter path: `/app/cognito/app_client_id`
    * Description: Required for [AWS Amplify](https://aws.amazon.com/amplify/) UI
* **Signing Lambda**
    * SSM parameter path: `/app/signing/lambda_arn`
    * Description: Required for nitro integration stack
* **Sub to KeyID mapping table name**:
    * SSM parameter path: `/app/signing/key_mapping_table`
    * Description: Required for nitro integration stack
* **JWT pre token gen Labmda**
    * SSM parameter path: `/app/signing/pre_token_gen`
    * Description: Required for nitro integration stack
* **Account Abstraction (AA) Processing Labmda**
    * SSM parameter path: `/app/signing/aa_processing_lambda`
    * Description: Required for nitro integration stack