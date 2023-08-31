#!/usr/bin/env python3
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
import os

# import aws_cdk as cdk
import cdk_nag

from aws_cdk import App, Aspects, Environment

from web3workshop_cognito_kms.web3workshop_cognito_kms import (
    Web3WorkshopCognitoKMSStack,
)
from web3workshop_cognito_kms.web3workshop_nitro_integration import (
    Web3WorkshopNitroIntegrationStack,
)

app = App()
workshop_foundation = Web3WorkshopCognitoKMSStack(
    app,
    "Web3WorkshopCognitoKMSStack",
    env=Environment(
        region=os.environ.get("CDK_DEPLOY_REGION", os.environ["CDK_DEFAULT_REGION"]),
        account=os.environ["CDK_DEPLOY_ACCOUNT"],
    ),
)

# Web3WorkshopNitroIntegrationStack(app, "Web3WorkshopNitroIntegrationStack",
#                                   env=Environment(
#                                       region=os.environ.get("CDK_DEPLOY_REGION", os.environ["CDK_DEFAULT_REGION"]),
#                                       account=os.environ['CDK_DEPLOY_ACCOUNT']
#                                   ))

Aspects.of(app).add(cdk_nag.AwsSolutionsChecks())

app.synth()
