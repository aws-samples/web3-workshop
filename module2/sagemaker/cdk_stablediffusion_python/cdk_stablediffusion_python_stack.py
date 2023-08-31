# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
from aws_cdk import (
    Stack, Duration,
    aws_iam as iam,
    aws_ssm as ssm,
    aws_lambda as _lambda,
    aws_apigateway as apigateway,
    custom_resources as cr
)

from constructs import Construct
from util.sagemaker_endpoint_construct import SageMakerEndpointConstruct
from datetime import datetime


class CdkStablediffusionPythonStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, model_info, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Get the instance count parameter from the context or use a default value
        instance_count_param = self.node.try_get_context("instance_count_param")
        instance_count = int(instance_count_param) if instance_count_param else 1

        role = iam.Role(self, "Gen-AI-SageMaker-Policy", assumed_by=iam.ServicePrincipal("sagemaker.amazonaws.com"))
        role.add_managed_policy(iam.ManagedPolicy.from_aws_managed_policy_name("AmazonS3FullAccess"))

        sts_policy = iam.Policy(self, "sm-deploy-policy-sts",
                                statements=[iam.PolicyStatement(
                                    effect=iam.Effect.ALLOW,
                                    actions=[
                                        "sts:AssumeRole"
                                    ],
                                    resources=["*"]
                                )]
                                )

        logs_policy = iam.Policy(self, "sm-deploy-policy-logs",
                                 statements=[iam.PolicyStatement(
                                     effect=iam.Effect.ALLOW,
                                     actions=[
                                         "cloudwatch:PutMetricData",
                                         "logs:CreateLogStream",
                                         "logs:PutLogEvents",
                                         "logs:CreateLogGroup",
                                         "logs:DescribeLogStreams",
                                         "ecr:GetAuthorizationToken"
                                     ],
                                     resources=["*"]
                                 )]
                                 )

        ecr_policy = iam.Policy(self, "sm-deploy-policy-ecr",
                                statements=[iam.PolicyStatement(
                                    effect=iam.Effect.ALLOW,
                                    actions=[
                                        "ecr:*",
                                    ],
                                    resources=["*"]
                                )]
                                )

        role.attach_inline_policy(sts_policy)
        role.attach_inline_policy(logs_policy)
        role.attach_inline_policy(ecr_policy)

        # Generate a unique model name
        model_name = f"SDTxt2Img-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        # Create a SageMaker endpoint that can be used to generate images from text
        endpoint = SageMakerEndpointConstruct(self, "TXT2IMG",
                                              project_prefix=f"GenAIDemo-{instance_count}",
                                              role_arn=role.role_arn,
                                              model_name=model_name,
                                              model_bucket_name=model_info["model_bucket_name"],
                                              model_bucket_key=model_info["model_bucket_key"],
                                              model_docker_image=model_info["model_docker_image"],
                                              variant_name="AllTraffic",
                                              variant_weight=1,
                                              instance_count=instance_count,
                                              instance_type=model_info["instance_type"],
                                              environment={
                                                  "MMS_MAX_RESPONSE_SIZE": "20000000",
                                                  "SAGEMAKER_CONTAINER_LOG_LEVEL": "20",
                                                  "SAGEMAKER_PROGRAM": "inference.py",
                                                  "SAGEMAKER_REGION": model_info["region_name"],
                                                  "SAGEMAKER_SUBMIT_DIRECTORY": "/opt/ml/model/code",
                                              },

                                              deploy_enable=True
                                              )

        endpoint.node.add_dependency(sts_policy)
        endpoint.node.add_dependency(logs_policy)
        endpoint.node.add_dependency(ecr_policy)

        ssm.StringParameter(self, "txt2img_endpoint", parameter_name="txt2img_endpoint",
                            string_value=endpoint.endpoint_name)

        # Create a Lambda function to invoke the SageMaker endpoint
        lambda_function = _lambda.Function(
            self,
            "InvokeSagemakerEndpointLambda",
            function_name="InvokeSagemakerEndpointLambda",
            runtime=_lambda.Runtime.PYTHON_3_9,
            handler="InvokeSagemakerEndpointLambda.lambda_handler",
            code=_lambda.Code.from_asset("lambda"),
            environment={
                "SAGEMAKER_ENDPOINT_NAME": endpoint.endpoint_name,
            },
            timeout=Duration.seconds(500)
        )

        # Add the necessary IAM permissions to the Lambda function to invoke the SageMaker endpoint
        lambda_function.add_to_role_policy(iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=["sagemaker:InvokeEndpoint"],
            resources=[endpoint.endpoint_arn]
        ))

        # Add the SageMaker endpoint as a dependency of the Lambda function
        lambda_function.node.add_dependency(endpoint)

        # Create the REST API Gateway
        api = apigateway.RestApi(
            self,
            "StableDiffusionAPI",
            rest_api_name="StableDiffusionAPI"
        )

        # Add the usage plan
        usage_plan = api.add_usage_plan(
            "StableDiffusionAPIUsagePlan",
            name="StableDiffusionAPIUsagePlan",
            throttle=apigateway.ThrottleSettings(
                rate_limit=1000,
                burst_limit=2000
            )
        )
        # Create the API key
        api_key_value = "Welcome123Welcome123"
        api_key = api.add_api_key("StableDiffusionAPIKey", value=api_key_value)

        # Associate the API key with the usage plan
        usage_plan.add_api_key(api_key)


        ssm_sagemaker_endpoint_url = ssm.StringParameter.from_string_parameter_name(
            self,
            "ssmSagemakerEndpointURL",
            string_parameter_name="/app/sagemaker/endpoint/apiurl",
        )

        ssm_sagemaker_endpoint_api_key = ssm.StringParameter.from_string_parameter_name(
            self,
            "ssmSagemakerEndpointApiKey",
            string_parameter_name="/app/sagemaker/endpoint/apikey",
        )

        for param_name, parameter_arn, param_value in [
            (ssm_sagemaker_endpoint_url.parameter_name, ssm_sagemaker_endpoint_url.parameter_arn, f"{api.url}generateimage"),
            (ssm_sagemaker_endpoint_api_key.parameter_name, ssm_sagemaker_endpoint_api_key.parameter_arn,
             api_key_value)]:
            cr_aws_sdk_call = cr.AwsSdkCall(
                                     service="SSM",
                                     action="putParameter",
                                     parameters={
                                         "Name": param_name,
                                         "Value": param_value,
                                         "Overwrite": True
                                     },
                                    physical_resource_id=cr.PhysicalResourceId.of(parameter_arn))
            cr.AwsCustomResource(self, f"{param_name.split('/')[4]}PutParameterCustomResource",
                                 on_create=cr_aws_sdk_call,
                                 on_update=cr_aws_sdk_call,
                                 policy=cr.AwsCustomResourcePolicy.from_sdk_calls(
                                     resources=cr.AwsCustomResourcePolicy.ANY_RESOURCE
                                 )
                                 )

        # Create the API Gateway integration with the Lambda function
        integration = apigateway.LambdaIntegration(
            lambda_function,
            proxy=True,
        )

        # Create a resource and attach the integration
        resource = api.root.add_resource("generateimage")
        method = resource.add_method(
            http_method="POST",
            integration=integration,
            api_key_required=True
        )
        # Add the API stage and associate it with the usage plan
        stage = api.deployment_stage
        usage_plan.add_api_stage(
            api=api,
            stage=api.deployment_stage
        )

        # Add dependency between Lambda function and API Gateway
        api.node.add_dependency(lambda_function)
