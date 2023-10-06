# web3-workshop

This repository contains all artifacts for the [Build Web3 on AWS](https://catalog.workshops.aws/buildweb3) workshop.

## Deployment

The detailed deployment instructions can be found in the workshop [Build Web3 on AWS](https://catalog.workshops.aws/buildweb3).


## Development

### Module 1
To run e2e integration tests for module 1, execute the following steps:

1. Clone the repository and change into the directory:
   ```sh
   git clone https://github.com/aws-samples/web3-workshop.git
   cd web3-workshop
   ```

2. Add the required credentials to `./tests/module1/run_e2e_pipeline.sh`.

3. Ensure that you have your [`aws cli` configured](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) correctly and have it pointing to the right AWS account.

4. Export the required `CDK` environment variables to configure the AWS region and account used for the deployment. 
   ```sh
   export CDK_DEPLOY_REGION=us-east-1
   export CDK_DEPLOY_ACCOUNT=$(aws sts get-caller-identity | jq -r '.Account')
   ``` 

5. Run the e2e script:
   ```sh
   ./tests/module1/run_e2e_pipeline.sh
   ```

### Module 2
Module 2 requires module 1 to be fully configured and deployed in the same AWS account and region. Please ensure that all steps defined in `Module 1` have been executed successfully.

The deployment script requires [yq](https://github.com/mikefarah/yq) to modify YAML files on your local machine. It also assumes that you're working on a local machine (instead of a Cloud9 instance). If you don't have `yq` installed, the easiest way on a Mac is using homebrew: `brew install yq`. For other architectures, see the [installation guide](https://github.com/mikefarah/yq/#install).

1. Run the e2e script:
   ```sh
   ./tests/module2/run_e2e_pipeline.sh
   ```

### Cleanup
Separate cleanup scripts have been provided for module 1 and module 2.
If you have deployed module 2 and module 1, trigger the scripts in the following order
```sh
./tests/module2/cleanup.sh && \
./tests/module1/cleanup.sh
```

If only module 1 has been deployed run the following command:
```sh
./tests/module1/cleanup.sh
```

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

