#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
from aws_cdk import Stack, aws_ssm as ssm, aws_lambda as lambda_, aws_dynamodb as ddb
from constructs import Construct

from cdk_nag import NagSuppressions, NagPackSuppression
from lib.stepfunctions.nitro_sf import NitroJWTStepFunctionConstruct

DUMMY_VALUE = "arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/0123456789abcdef0123456789abcdef"


class Web3WorkshopNitroIntegrationStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        aa_processing_lambda_arn = ssm.StringParameter.value_from_lookup(
            self, parameter_name="/app/signing/aa_processing_lambda"
        )

        if aa_processing_lambda_arn.startswith("dummy-value-for"):
            aa_processing_lambda_arn = DUMMY_VALUE

        aa_processing_lambda = lambda_.Function.from_function_attributes(
            self,
            "AAProcessingLambda",
            function_arn=aa_processing_lambda_arn,
            same_environment=True,
        )

        key_mapping_table_arn = ssm.StringParameter.value_from_lookup(
            self, parameter_name="/app/signing/key_mapping_table"
        )

        if key_mapping_table_arn.startswith("dummy-value-for"):
            key_mapping_table_arn = DUMMY_VALUE

        key_mapping_table = ddb.Table.from_table_arn(
            self, "KeyMappingTable", table_arn=key_mapping_table_arn
        )

        pre_token_gen_lambda_arn = ssm.StringParameter.value_from_lookup(
            self, parameter_name="/app/signing/pre_token_gen"
        )

        if pre_token_gen_lambda_arn.startswith("dummy-value-for"):
            pre_token_gen_lambda_arn = DUMMY_VALUE

        pre_token_gen_lambda = lambda_.Function.from_function_attributes(
            self,
            "PreTokenGen",
            function_arn=pre_token_gen_lambda_arn,
            same_environment=True,
        )

        nitro_secrets_table_arn = ssm.StringParameter.value_from_lookup(
            self, parameter_name="/app/ethereum/secrets_table"
        )

        if nitro_secrets_table_arn.startswith("dummy-value-for"):
            nitro_secrets_table_arn = DUMMY_VALUE

        nitro_secrets_table = ddb.Table.from_table_arn(
            self, "NitroSecretsTable", table_arn=nitro_secrets_table_arn
        )

        nitro_invoke_lambda_arn = ssm.StringParameter.value_from_lookup(
            self, parameter_name="/app/ethereum/invoke_lambda"
        )

        if nitro_invoke_lambda_arn.startswith("dummy-value-for"):
            nitro_invoke_lambda_arn = DUMMY_VALUE
        nitro_invoke_lambda = lambda_.Function.from_function_attributes(
            self,
            "NitroInvokeFunction",
            function_arn=nitro_invoke_lambda_arn,
            same_environment=True,
        )

        # todo implicit permissions for invoke lambda
        nitro_sf = NitroJWTStepFunctionConstruct(
            self,
            "NitroSFConstruct",
            "nitro",
            key_mapping_table,
            nitro_secrets_table,
            aa_processing_lambda,
            nitro_invoke_lambda,
        )

        nitro_sf.step_function.grant_start_sync_execution(pre_token_gen_lambda)
        nitro_invoke_lambda.grant_invoke(nitro_sf.step_function)
        aa_processing_lambda.grant_invoke(nitro_sf.step_function)

        # todo update kms or nitro ssm parameter
        # pre_token_gen_lambda.add_environment(
        #     key=f"{signing_backend.upper()}_PRE_TOKEN_SF",
        #     value=pre_token_gen_express_sf.state_machine_arn,
        # )
        # nitro_secrets_table.grant_read(nitro_sf.step_function)
        # key_mapping_table.grant_write_data(nitro_sf.step_function)

        NagSuppressions.add_resource_suppressions(
            construct=self,
            suppressions=[
                NagPackSuppression(
                    id="AwsSolutions-IAM5",
                    reason="All policies managed by CDK and reflect minimal permissions",
                )
            ],
            apply_to_children=True,
        )
