#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
import boto3

import os
import web3

import web3.eth
import eth_typing
from web3.exceptions import ContractLogicError

from aws_lambda_powertools import Logger
from aa_abi import ENTRYPOINT_ABI, ACCOUNT_FACTORY_ABI

session = boto3.session.Session()
client_ssm = boto3.client("ssm")

logger = Logger()


def get_account_address(public_address: str) -> eth_typing.ChecksumAddress:
    try:
        init_code = get_account_init_code(public_address)
    except Exception as e:
        raise Exception(
            f"exception happened calculating init code for account ({public_address}): {e}"
        )

    try:
        counterfactual_address = call_entrypoint(init_code)
    except Exception as e:
        raise Exception(
            f"exception happened calling entrypoint smart contract for counterfactual address: {e}"
        )

    logger.debug(f"calculated address: {counterfactual_address}")

    return counterfactual_address


def call_entrypoint(init_code: bytes) -> eth_typing.ChecksumAddress:
    try:
        entrypoint_address = client_ssm.get_parameter(
            Name=os.getenv("AA_ENTRYPOINT_ADDRESS_SSM_PARAM")
        )
        rpc_endpoint = client_ssm.get_parameter(
            Name=os.getenv("RPC_ENDPOINT_SSM_PARAM")
        )
    except Exception as e:
        raise Exception(f"exception happened getting parameter from SSM: {e}")

    if rpc_endpoint["Parameter"]["Value"] == "my.rpc.endpoint":
        # if no rpc_endpoint parameter present just return empty ChecksumAddress
        return eth_typing.ChecksumAddress(eth_typing.HexAddress(eth_typing.HexStr("")))

    w3 = web3.Web3(web3.HTTPProvider(rpc_endpoint["Parameter"]["Value"]))
    entrypoint_contract = w3.eth.contract(
        address=entrypoint_address["Parameter"]["Value"], abi=ENTRYPOINT_ABI
    )
    counterfactual_address = ""
    try:
        entrypoint_contract.functions.getSenderAddress(init_code).call()
    except ContractLogicError as e:
        # function always reverts
        counterfactual_address = e.data

    try:
        sender = counterfactual_address[34:]
        sender_checksum_address = w3.to_checksum_address(sender)
    except Exception as e:
        raise Exception(
            f"exception happened calculating Ethereum checksum address from AA address: {e}"
        )

    return sender_checksum_address


def get_account_init_code(address: str) -> bytes:
    try:
        factory_address = client_ssm.get_parameter(
            Name=os.getenv("AA_ACCOUNT_FACTORY_ADDRESS_SSM_PARAM")
        )
    except Exception as e:
        raise Exception(f"exception happened getting parameter from SSM: {e}")

    w3 = web3.Web3()
    account_factory_contract = w3.eth.contract(abi=ACCOUNT_FACTORY_ABI)
    # todo validate salt
    account_factory_contract_call = account_factory_contract.encodeABI(
        fn_name="createAccount", args=[address, 0]
    )
    logger.debug(f"contract call encoding: {account_factory_contract_call}")

    init_code = (
        f"{factory_address['Parameter']['Value']}{account_factory_contract_call[2:]}"
    )
    logger.debug(f"account init code: {init_code}")

    return w3.to_bytes(hexstr=init_code)


def lambda_handler(event, context):
    config = [
        "LOG_LEVEL_SSM_PARAM",
        "RPC_ENDPOINT_SSM_PARAM",
        "AA_ACCOUNT_FACTORY_ADDRESS_SSM_PARAM",
        "AA_ENTRYPOINT_ADDRESS_SSM_PARAM",
    ]
    for param in config:
        if param not in os.environ or not os.getenv(param):
            raise Exception(f"environment config parameter missing: {param}")

    try:
        log_level = client_ssm.get_parameter(Name=os.environ["LOG_LEVEL_SSM_PARAM"])
    except Exception as e:
        raise e
    else:
        logger.setLevel(log_level["Parameter"]["Value"])

    logger.debug(f"incoming request: {event}")

    operation = event.get("operation")
    if not operation:
        raise Exception("operation parameter in request must be specified")

    if operation == "counterfactual_address":
        key_id = event["key_id"]
        address = event["address"]

        try:
            account_address = get_account_address(address)
        except Exception as e:
            raise Exception(
                f"exception happened calculating the AA address for key_id({key_id})/address({address}): {e}"
            )

        return {
            "account": account_address,
            "backend": event["backend"],
            "address": event["address"],
            "key_id": event["key_id"],
        }

    else:
        raise Exception(f"operation not supported: {operation}")
