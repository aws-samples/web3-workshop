#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
import boto3
import json
import os
import logging

session = boto3.session.Session()
client_stepfunctions = boto3.client("stepfunctions")
client_ssm = boto3.client("ssm")
logger = logging.getLogger()


def lambda_handler(event, context):
    try:
        log_level = client_ssm.get_parameter(Name=os.environ["LOG_LEVEL_SSM_PARAM"])
    except Exception as e:
        raise e
    else:
        logger.setLevel(log_level["Parameter"]["Value"])

    # todo key mode configurable ia ssm
    key_mode = os.getenv("KEY_MODE")
    aa_pre_token_gen_sf_arn = os.getenv("AA_PRE_TOKEN_SF")
    kms_pre_token_gen_sf_arn = os.getenv("KMS_PRE_TOKEN_SF")

    # todo needs to be configurable via ssm not env
    if key_mode == "KMS":
        pre_token_gen_sf_arn = kms_pre_token_gen_sf_arn
    elif key_mode == "NITRO":
        pre_token_gen_sf_arn = aa_pre_token_gen_sf_arn
    else:
        logger.error("invalid key_mode detected - just KMS and AA supported right now")
        return

    sub = event["request"]["userAttributes"]["sub"]
    email = event["request"]["userAttributes"]["email"]

    try:
        response_stepfunctions_start = client_stepfunctions.start_sync_execution(
            stateMachineArn=pre_token_gen_sf_arn,
            name="{}-{}".format("key_id_lookup", sub),
            input=json.dumps({"sub": sub, "email": email}),
        )
    except Exception as e:
        logger.error(f"exception happened: {e}")
        raise

    logger.debug(f"stepfunction start: {response_stepfunctions_start}")

    output = response_stepfunctions_start["output"]
    output_parsed = json.loads(output)

    key_id = output_parsed["key_id"]
    public_address = output_parsed["address"]
    account_address = output_parsed["account"]
    backend = output_parsed["backend"]

    event["response"]["claimsOverrideDetails"] = {
        "claimsToAddOrOverride": {
            "key_id": key_id,
            "public_address": public_address,
            "backend": backend,
        }
    }

    if account_address:
        # if empty account address is being returned just ignore
        event["response"]["claimsOverrideDetails"]["claimsToAddOrOverride"][
            "account_address"
        ] = account_address

    # return modified ID token to Amazon Cognito
    return event
