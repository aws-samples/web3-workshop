#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
from constructs import Construct

from aws_cdk import (
    RemovalPolicy,
    Duration,
    aws_dynamodb as dynamodb,
    aws_stepfunctions as sf,
    aws_stepfunctions_tasks as sf_tasks,
    aws_logs as logs,
    aws_lambda as lambda_,
)


class JWTStepFunctionConstruct(Construct):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        signing_backend: str,
        key_mapping_table: dynamodb.ITable,
        key_table: dynamodb.ITable,
        aa_processing_lambda: lambda_.IFunction,
        key_management_lambda: lambda_.IFunction
    ) -> None:
        super().__init__(scope, construct_id)

        pre_token_gen_start = sf.Pass(
            self,
            f"{signing_backend}PreTokenGenStepFunction",
            parameters={"sub.$": "$.sub"},
        )

        pre_token_gen_lookup_key_mapping = sf_tasks.DynamoGetItem(
            self,
            f"{signing_backend}LookupKeyIDForSub",
            key={
                "sub": sf_tasks.DynamoAttributeValue.from_string(
                    sf.JsonPath.string_at("$.sub")
                )
            },
            table=key_mapping_table,
            result_path="$.KeyIDForSub",
        )

        pre_token_gen_lookup_key_params = sf_tasks.DynamoGetItem(
            self,
            f"{signing_backend}LookupKeyParamsForKeyID",
            key={
                "key_id": sf_tasks.DynamoAttributeValue.from_string(
                    sf.JsonPath.string_at("$.KeyIDForSub.Item.key_id.S")
                )
            },
            table=key_table,
            result_path="$.KeyParamsForKeyID",
        )

        pre_token_existing_key_calc_aa_address = sf_tasks.LambdaInvoke(
            self,
            "existingKeyAAAccountAddress",
            lambda_function=aa_processing_lambda,
            payload=sf.TaskInput.from_object(
                {
                    "operation": "counterfactual_address",
                    "key_id.$": "$.KeyParamsForKeyID.Item.key_id.S",
                    "address.$": "$.KeyParamsForKeyID.Item.address.S",
                    "backend.$": "$.KeyIDForSub.Item.backend.S",
                }
            ),
            result_path="$.JWTKeyOutput",
            output_path="$.JWTKeyOutput",
            result_selector={
                "key_id.$": "$.Payload.key_id",
                "address.$": "$.Payload.address",
                "backend.$": "$.Payload.backend",
                "account.$": "$.Payload.account",
            },
            retry_on_service_exceptions=True,
        )

        pre_token_existing_key_success = sf.Succeed(
            self, f"{signing_backend}ExistingKeySucceed"
        )

        pre_token_gen_new_key = sf_tasks.LambdaInvoke(
            self,
            f"{signing_backend}KeyGeneration",
            lambda_function=key_management_lambda,
            payload=sf.TaskInput.from_object({"sub.$": "$.sub"}),
            result_path="$.KeyOutput",
            retry_on_service_exceptions=True,
        )

        pre_token_store_new_key = sf_tasks.DynamoPutItem(
            self,
            f"{signing_backend}DDBPutNewKey",
            table=key_table,
            item={
                "key_id": sf_tasks.DynamoAttributeValue.from_string(
                    sf.JsonPath.string_at("$.KeyOutput.Payload.key_id")
                ),
                "ciphertext": sf_tasks.DynamoAttributeValue.from_string(
                    sf.JsonPath.string_at("$.KeyOutput.Payload.ciphertext")
                ),
                "address": sf_tasks.DynamoAttributeValue.from_string(
                    sf.JsonPath.string_at("$.KeyOutput.Payload.address")
                ),
            },
            result_path="$.PutKeyOutput",
        )

        pre_token_store_new_mapping = sf_tasks.DynamoPutItem(
            self,
            f"{signing_backend}DDBPutNewSubToKeyIDMapping",
            table=key_mapping_table,
            item={
                "sub": sf_tasks.DynamoAttributeValue.from_string(
                    sf.JsonPath.string_at("$.sub")
                ),
                "key_id": sf_tasks.DynamoAttributeValue.from_string(
                    sf.JsonPath.string_at("$.KeyOutput.Payload.key_id")
                ),
                "backend": sf_tasks.DynamoAttributeValue.from_string(
                    sf.JsonPath.string_at("$.KeyOutput.Payload.backend")
                ),
            },
            result_path="$.PutMappingOutput",
        )

        pre_token_new_key_calc_aa_address = sf_tasks.LambdaInvoke(
            self,
            "newKeyAAAccountAddress",
            lambda_function=aa_processing_lambda,
            payload=sf.TaskInput.from_object(
                {
                    "operation": "counterfactual_address",
                    "key_id.$": "$.KeyOutput.Payload.key_id",
                    "address.$": "$.KeyOutput.Payload.address",
                    "backend.$": "$.KeyOutput.Payload.backend",
                }
            ),
            result_path="$.JWTKeyOutput",
            output_path="$.JWTKeyOutput",
            result_selector={
                "key_id.$": "$.Payload.key_id",
                "address.$": "$.Payload.address",
                "backend.$": "$.Payload.backend",
                "account.$": "$.Payload.account",
            },
            retry_on_service_exceptions=True,
        )

        pre_token_new_key_success = sf.Succeed(self, f"{signing_backend}NewKeySucceed")

        # key generation part
        pre_token_new_key_flow_definition = (
            pre_token_gen_new_key.next(pre_token_store_new_key)
            .next(pre_token_store_new_mapping)
            .next(pre_token_new_key_calc_aa_address)
            .next(pre_token_new_key_success)
        )

        existing_key_flow_definition = pre_token_gen_lookup_key_params.next(
            pre_token_existing_key_calc_aa_address
        ).next(pre_token_existing_key_success)

        pre_token_gen_choice = (
            sf.Choice(
                self,
                f"{signing_backend}ChoiceKeyIDForSub",
            )
            .when(
                sf.Condition.is_present("$.KeyIDForSub.Item"),
                existing_key_flow_definition,
            )
            .otherwise(pre_token_new_key_flow_definition)
        )

        pre_token_gen_definition = pre_token_gen_start.next(
            pre_token_gen_lookup_key_mapping
        ).next(pre_token_gen_choice)

        pre_token_gen_express_sf_log_group = logs.LogGroup(
            self,
            # todo stack id to avoid duplicates
            f"{signing_backend}EthereumExpressStepFunctionLogGroup",
            log_group_name=f"/aws/vendedlogs/{signing_backend}EthereumExpressStepFunctionLogGroup",
            removal_policy=RemovalPolicy.DESTROY,
        )
        pre_token_gen_express_sf = sf.StateMachine(
            self,
            f"{signing_backend}PreTokenGenExpressSF",
            definition=pre_token_gen_definition,
            state_machine_type=sf.StateMachineType.EXPRESS,
            timeout=Duration.minutes(2),
            logs=sf.LogOptions(
                destination=pre_token_gen_express_sf_log_group,
                level=sf.LogLevel.ALL,
                include_execution_data=True,
            ),
            tracing_enabled=True,
        )

        self.step_function = pre_token_gen_express_sf
