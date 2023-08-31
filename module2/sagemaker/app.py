#!/usr/bin/env python3
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
from aws_cdk import Environment, App
import os
from cdk_stablediffusion_python.cdk_stablediffusion_python_stack import CdkStablediffusionPythonStack
from util.sagemaker_util import *

# Text to Image model parameters
TXT2IMG_MODEL_ID = "model-txt2img-stabilityai-stable-diffusion-v2-1-base"

# For Development
TXT2IMG_INFERENCE_INSTANCE_TYPE = "ml.g5.2xlarge"

# For Production
#TXT2IMG_INFERENCE_INSTANCE_TYPE = "ml.g5.12xlarge"

TXT2IMG_MODEL_INFO = get_sagemaker_uris(model_id=TXT2IMG_MODEL_ID,
                                        instance_type=TXT2IMG_INFERENCE_INSTANCE_TYPE,
                                        region_name=os.environ.get("CDK_DEPLOY_REGION"))

print(f"model info: {TXT2IMG_MODEL_INFO}")

app = App()

stack = CdkStablediffusionPythonStack(
    app,
    "Web3WorkshopStableDiffusionStack",
    model_info=TXT2IMG_MODEL_INFO,
    env=Environment(
        region=os.environ.get("CDK_DEPLOY_REGION", os.environ["CDK_DEFAULT_REGION"]),
        account=os.environ["CDK_DEPLOY_ACCOUNT"],
    ),
)

app.synth()
