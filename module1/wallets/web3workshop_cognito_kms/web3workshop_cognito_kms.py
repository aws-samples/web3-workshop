#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
from aws_cdk import (
    Duration,
    Stack,
    RemovalPolicy,
    aws_cognito as cognito,
    aws_ssm as ssm,
    aws_lambda as lambda_,
    aws_dynamodb as ddb,
    aws_lambda_python_alpha as lambda_python,
    Fn,
    aws_kms as kms,
    PhysicalName,
)
from constructs import Construct

from cdk_nag import NagSuppressions, NagPackSuppression
from lib.stepfunctions.kms_sf import JWTStepFunctionConstruct


class Web3WorkshopCognitoKMSStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        ssm_rpc_endpoint_parameter = ssm.StringParameter.from_string_parameter_name(
            self,
            "ssmRPCEndpointParameter",
            string_parameter_name="/web3/rpc_endpoint_counterfactual",
        )

        # instantiate ssm parameters as string parameters if runtime lookup happens in one of the Lambda functions
        # use lookup_from_string for deploy time parameters
        ssm_aa_entrypoint_address_parameter = (
            ssm.StringParameter.from_string_parameter_name(
                self,
                "ssmAAEntrypointAddressParameter",
                string_parameter_name="/web3/aa/entrypoint_address",
            )
        )

        ssm_aa_account_factory_address_parameter = (
            ssm.StringParameter.from_string_parameter_name(
                self,
                "ssmAAAccountFactoryAddressParameter",
                string_parameter_name="/web3/aa/account_factory_address",
            )
        )

        ssm_log_level_parameter = ssm.StringParameter.from_string_parameter_name(
            self,
            "ssmLogLevelParameter",
            string_parameter_name="/app/log_level",
        )

        # dynamodb table (sub to key_id) for cognito - can be used by kms and nitro key flow
        key_mapping_table = ddb.Table(
            self,
            "subToKeyIDMapping",
            partition_key=ddb.Attribute(name="sub", type=ddb.AttributeType.STRING),
            encryption=ddb.TableEncryption.AWS_MANAGED,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery=True,
        )
        self.key_mapping_table = key_mapping_table

        # dynamodb table (key_id to secrets) to store ciphertext for kms key flow
        kms_key_table = ddb.Table(
            self,
            "keyIDToCiphertext",
            partition_key=ddb.Attribute(name="key_id", type=ddb.AttributeType.STRING),
            encryption=ddb.TableEncryption.AWS_MANAGED,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery=True,
        )

        kms_key = kms.Key(
            self,
            "kmsSymKey",
            key_spec=kms.KeySpec.SYMMETRIC_DEFAULT,
            enable_key_rotation=True,
            removal_policy=RemovalPolicy.DESTROY,
        )

        web3_dependency_layer = lambda_python.PythonLayerVersion(
            self,
            "lambdaWeb3Layer",
            entry="lib/lambda/web3_layer",
            compatible_runtimes=[lambda_.Runtime.PYTHON_3_9],
        )

        kms_key_management_lambda = lambda_python.PythonFunction(
            self,
            "kmsKeyManagementLambda",
            entry="lib/lambda/kms_key_management",
            handler="lambda_handler",
            index="lambda_function.py",
            runtime=lambda_.Runtime.PYTHON_3_9,
            timeout=Duration.minutes(2),
            memory_size=256,
            environment={
                "LOG_LEVEL_SSM_PARAM": ssm_log_level_parameter.parameter_name,
                "KMS_KEY_ID": kms_key.key_id,
            },
            layers=[web3_dependency_layer],
        )
        kms_key.grant(
            kms_key_management_lambda, "kms:GenerateDataKeyPairWithoutPlaintext"
        )
        ssm_log_level_parameter.grant_read(kms_key_management_lambda)

        aa_processing_lambda = lambda_python.PythonFunction(
            self,
            "aaProcessingLambda",
            function_name=PhysicalName.GENERATE_IF_NEEDED,
            entry="lib/lambda/aa_processing",
            handler="lambda_handler",
            index="lambda_function.py",
            runtime=lambda_.Runtime.PYTHON_3_9,
            timeout=Duration.minutes(2),
            memory_size=256,
            environment={
                "LOG_LEVEL_SSM_PARAM": ssm_log_level_parameter.parameter_name,
                "RPC_ENDPOINT_SSM_PARAM": ssm_rpc_endpoint_parameter.parameter_name,
                "AA_ACCOUNT_FACTORY_ADDRESS_SSM_PARAM": ssm_aa_account_factory_address_parameter.parameter_name,
                "AA_ENTRYPOINT_ADDRESS_SSM_PARAM": ssm_aa_entrypoint_address_parameter.parameter_name,
            },
            layers=[web3_dependency_layer],
        )
        self.aa_processing_lambda = aa_processing_lambda

        ssm_log_level_parameter.grant_read(aa_processing_lambda)
        ssm_rpc_endpoint_parameter.grant_read(aa_processing_lambda)
        ssm_aa_account_factory_address_parameter.grant_read(aa_processing_lambda)
        ssm_aa_entrypoint_address_parameter.grant_read(aa_processing_lambda)

        userop_tx_signing_lambda = lambda_python.PythonFunction(
            self,
            "signingLambda",
            entry="lib/lambda/userop_tx_signing",
            handler="lambda_handler",
            index="lambda_function.py",
            runtime=lambda_.Runtime.PYTHON_3_9,
            timeout=Duration.minutes(2),
            memory_size=256,
            environment={
                "LOG_LEVEL_SSM_PARAM": ssm_log_level_parameter.parameter_name,
                "RPC_ENDPOINT_SSM_PARAM": ssm_rpc_endpoint_parameter.parameter_name,
                "KMS_KEY_TABLE": kms_key_table.table_name,
                "KMS_KEY_ID": kms_key.key_id,
            },
            layers=[web3_dependency_layer],
        )

        ssm_log_level_parameter.grant_read(userop_tx_signing_lambda)
        ssm_rpc_endpoint_parameter.grant_read(userop_tx_signing_lambda)
        ssm_aa_account_factory_address_parameter.grant_read(userop_tx_signing_lambda)
        ssm_aa_entrypoint_address_parameter.grant_read(userop_tx_signing_lambda)
        kms_key_table.grant_read_data(userop_tx_signing_lambda)
        kms_key.grant_decrypt(userop_tx_signing_lambda)

        pre_token_gen_lambda = lambda_python.PythonFunction(
            self,
            "preTokenGenLambda",
            entry="lib/lambda/pre_token_gen",
            handler="lambda_handler",
            index="lambda_function.py",
            runtime=lambda_.Runtime.PYTHON_3_9,
            timeout=Duration.minutes(2),
            memory_size=256,
            environment={
                "LOG_LEVEL_SSM_PARAM": ssm_log_level_parameter.parameter_name,
                "KEY_MODE": "KMS",
            },
        )
        self.pre_token_gen_lambda = pre_token_gen_lambda
        ssm_log_level_parameter.grant_read(pre_token_gen_lambda)

        pre_token_gen_express_sf = JWTStepFunctionConstruct(
            self,
            "KMSSFConstruct",
            "kms",
            key_mapping_table,
            kms_key_table,
            aa_processing_lambda,
            kms_key_management_lambda,
        )

        pre_token_gen_express_sf.step_function.grant_start_sync_execution(
            pre_token_gen_lambda
        )

        # sf to update key storage and mapping table
        kms_key_table.grant_write_data(pre_token_gen_express_sf.step_function)
        key_mapping_table.grant_write_data(pre_token_gen_express_sf.step_function)
        aa_processing_lambda.grant_invoke(pre_token_gen_express_sf.step_function)
        kms_key_management_lambda.grant_invoke(pre_token_gen_express_sf.step_function)

        # todo update kms or nitro ssm parameter
        pre_token_gen_lambda.add_environment(
            key="KMS_PRE_TOKEN_SF",
            value=pre_token_gen_express_sf.step_function.state_machine_arn,
        )

        # todo uncomment and redeploy if AWS Nitro Enclave integration should be configured
        #  nitro specific parameters should be provided via ssm lookup so that update will fail if parameters are not present

        user_pool = cognito.UserPool(
            self,
            "userPool",
            lambda_triggers=cognito.UserPoolTriggers(
                pre_token_generation=pre_token_gen_lambda
            ),
            removal_policy=RemovalPolicy.DESTROY,
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            self_sign_up_enabled=True,
            # cannot be modified inplace - needs CF stack to be deleted first
            # https://github.com/aws/aws-cdk/issues/7058#issuecomment-607153473
            standard_attributes=cognito.StandardAttributes(
                email=cognito.StandardAttribute(required=True, mutable=False),
            ),
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_uppercase=True,
                require_digits=True,
                require_symbols=True,
                require_lowercase=True,
            ),
            advanced_security_mode=cognito.AdvancedSecurityMode.ENFORCED,
            sign_in_aliases=cognito.SignInAliases(username=False, email=True),
        )

        user_pool_app_client = cognito.UserPoolClient(
            self,
            "userPoolAppClient",
            user_pool=user_pool,
            auth_flows=cognito.AuthFlow(user_password=True, user_srp=True),
            id_token_validity=Duration.days(1)
        )

        # unique suffix to avoid duplicates
        domain_suffix = Fn.select(6, Fn.split("-", self.stack_id))

        cognito.UserPoolDomain(
            self,
            "userPoolDomain",
            user_pool=user_pool,
            cognito_domain=cognito.CognitoDomainOptions(
                domain_prefix=f"web3workshop-{domain_suffix}"
            ),
        )

        ssm_cognito_user_pool_id = ssm.StringParameter(
            self,
            "cognitoUserPoolID",
            parameter_name="/app/cognito/user_pool_id",
            string_value=user_pool.user_pool_id,
        )
        ssm_cognito_user_pool_id.node.add_dependency(user_pool)

        ssm_congnito_app_client_id = ssm.StringParameter(
            self,
            "cognitoAppClientID",
            parameter_name="/app/cognito/app_client_id",
            # app client id
            string_value=user_pool_app_client.user_pool_client_id,
        )
        ssm_congnito_app_client_id.node.add_dependency(user_pool_app_client)

        app_region = ssm.StringParameter(
            self,
            "appRegion",
            parameter_name="/app/region",
            string_value=self.region,
        )
        app_region.node.add_dependency(user_pool)

        ssm_signing_lambda_arn = ssm.StringParameter(
            self,
            "signingLambdaARN",
            parameter_name="/app/signing/lambda_arn",
            string_value=userop_tx_signing_lambda.function_arn,
        )
        ssm_signing_lambda_arn.node.add_dependency(userop_tx_signing_lambda)

        ssm_key_mapping_table = ssm.StringParameter(
            self,
            "mappingTableName",
            parameter_name="/app/signing/key_mapping_table",
            string_value=key_mapping_table.table_arn,
        )
        ssm_key_mapping_table.node.add_dependency(key_mapping_table)

        ssm_pre_token_gen_lambda = ssm.StringParameter(
            self,
            "preTokenGenLambdaARN",
            parameter_name="/app/signing/pre_token_gen",
            string_value=pre_token_gen_lambda.function_arn,
        )
        ssm_pre_token_gen_lambda.node.add_dependency(ssm_pre_token_gen_lambda)

        ssm_aa_processing_lambda = ssm.StringParameter(
            self,
            "aaProcessingLambdaARN",
            parameter_name="/app/signing/aa_processing_lambda",
            string_value=aa_processing_lambda.function_arn,
        )
        ssm_aa_processing_lambda.node.add_dependency(aa_processing_lambda)

        NagSuppressions.add_resource_suppressions(
            construct=self,
            suppressions=[
                NagPackSuppression(
                    id="AwsSolutions-COG2",
                    reason="No MFA required for workshop",
                ),
                NagPackSuppression(
                    id="AwsSolutions-COG2",
                    reason="No MFA required for workshop",
                ),
                NagPackSuppression(
                    id="AwsSolutions-IAM5",
                    reason="All policies managed by CDK and reflect minimal permissions",
                ),
                NagPackSuppression(
                    id="AwsSolutions-IAM4",
                    reason="All policies managed by CDK and reflect best practices",
                ),
            ],
            apply_to_children=True,
        )

    @property
    def get_aa_processing_lambda(self) -> lambda_.IFunction:
        return self.aa_processing_lambda

    @property
    def get_key_mapping_table(self) -> ddb.ITable:
        return self.key_mapping_table

    @property
    def get_pre_token_gen_lambda(self) -> lambda_.IFunction:
        return self.pre_token_gen_lambda
