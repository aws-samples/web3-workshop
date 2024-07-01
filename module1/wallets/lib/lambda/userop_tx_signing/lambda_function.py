#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
import os
import base64
import boto3
import eth_account
import web3
import web3.eth
from eth_account import Account
from ecdsa import SigningKey, SECP256k1

from aws_lambda_powertools import Logger

session = boto3.session.Session()
client_ssm = boto3.client("ssm")
client_kms = boto3.client("kms")
client_ddb = boto3.client("dynamodb")

logger = Logger()


def get_chain_id() -> int:
    try:
        rpc_endpoint = client_ssm.get_parameter(
            Name=os.getenv("RPC_ENDPOINT_SSM_PARAM")
        )
    except Exception as e:
        raise Exception(
            f"exception happened getting RPC_ENDPOINT parameter from SSM: {e}"
        )

    w3 = web3.Web3(web3.HTTPProvider(rpc_endpoint["Parameter"]["Value"]))

    try:
        chain_id = w3.eth.chain_id
    except Exception as e:
        raise Exception(
            f"exception happened getting chain_id via provided RPC endpoint: {e}"
        )

    return chain_id


def get_encrypted_kms_key(key_id: str) -> dict:
    kms_key_table = os.getenv("KMS_KEY_TABLE")
    print(f"get_encrypted_kms_key key_id: {key_id}")
    try:
        encrypted_kms_key = client_ddb.get_item(
            TableName=kms_key_table, 
            Key={"key_id": {"S": key_id}}
        )
    except Exception as e:
        raise Exception(
            f"exception happened getting encrypted key (key_id: {key_id}) from DynamoDB: {e}"
        )
    
    print(f"encrypted_kms_key DDB item: {encrypted_kms_key}")
    
    if "Item" not in encrypted_kms_key:
        logger.warning(f"no encrypted key found for key_id: {key_id}")
        return {}

    logger.debug(f"encrypted key content: {encrypted_kms_key['Item']}")

    try:
        ciphertext = base64.standard_b64decode(
            encrypted_kms_key["Item"]["ciphertext"]["S"]
        )
    except Exception as e:
        raise Exception(f"exception happened decoding b64 encoded ciphertext: {e}")

    return {"ciphertext": ciphertext, "address": encrypted_kms_key["Item"]["address"]}


def decrypt_encrypted_kms_key(ciphertext: bytes, sub: str) -> bytes:
    try:
        plaintext_key = client_kms.decrypt(
            KeyId=os.getenv("KMS_KEY_ID"),
            CiphertextBlob=ciphertext,
            EncryptionContext={"sub": sub},
        )
    except Exception as e:
        raise Exception(
            f"exception happened decrypting encrypted key with context ({sub}): {e}"
        )

    return plaintext_key["Plaintext"]


def parse_der_encoded_private_key(key_der: bytes) -> str:
    try:
        key = SigningKey.from_der(key_der)
    except Exception as e:
        raise Exception(f"exception happened parsing DER encoded private key: {e}")

    if key.curve.curve != SECP256k1.curve:
        raise Exception(
            f"private key type different from SECP256K1 curve: {key.curve.curve}"
        )

    key_serialized = key.to_string().hex()

    return key_serialized


def provide_signing_account(key_id: str, sub: str) -> eth_account.Account:
    try:
        encrypted_kms_key = get_encrypted_kms_key(key_id)
    except Exception as e:
        raise Exception(f"exception happened loading encrypted key from DynamoDB: {e}")

    try:
        plaintext_kms_key = decrypt_encrypted_kms_key(
            encrypted_kms_key["ciphertext"], sub
        )
    except Exception as e:
        raise Exception(f"exception happened decrypting key:{e}")

    try:
        key = parse_der_encoded_private_key(plaintext_kms_key)
    except Exception as e:
        raise Exception(f"exception happened parsing EC private key: {e}")

    try:
        # key is DER encoded -> contains public ke portion per default
        account = Account.from_key(key)
    except Exception as e:
        raise Exception(
            f"exception happened instantiating signer instance from provided private key: {e}"
        )

    return account


def sign_tx(tx_hash: str, key_id: str, sub: str) -> str:
    # todo tbd chain_id EIP155
    #  chain_id = get_chain_id()
    try:
        account = provide_signing_account(key_id, sub)
    except Exception as e:
        raise Exception(
            f"exception happened providing local signing account for tx signing:{e}"
        )

    try:
        # todo EIP155 not in effect yet - web3py using typed tx to determine v
        #  https://github.com/ethereum/eth-account/blob/master/eth_account/_utils/signing.py#L43
        #  current schema is v = v + 27
        tx_hash_signature = account.signHash(tx_hash).signature.hex()
    except Exception as e:
        raise Exception(
            f"exception happened signing provided transaction hash with signer instance: {e}"
        )

    del account

    # todo tbd return v, r, s
    #  reduce(lambda a, b: str(a) + str(b), tx_hash_signature)

    return tx_hash_signature


def sign_userop(userop_hash: str, key_id: str, sub: str) -> str:
    try:
        account = provide_signing_account(key_id, sub)
    except Exception as e:
        raise Exception(
            f"exception happened providing local signing account for userop signing:{e}"
        )

    try:
        # legacy v schema for signature right now v = v + 27
        # expecting ERC-191 hash https://eips.ethereum.org/EIPS/eip-191
        # account.sign_message()
        userop_hash_signature = account.signHash(userop_hash).signature.hex()
        # userop_hash_signature = sign_message_hash(account.)
    except Exception as e:
        raise Exception(
            f"exception happened signing provided transaction hash with signer instance: {e}"
        )

    del account

    return userop_hash_signature


def get_recovery_id(
    msg_hash: str, r: int, s: int, eth_checksum_addr: str, chain_id: int
) -> dict:
    v_lower = chain_id * 2 + 35
    v_range = [v_lower, v_lower + 1]

    for v in v_range:
        recovered_addr = Account._recover_hash(message_hash=msg_hash, vrs=(v, r, s))

        if recovered_addr == eth_checksum_addr:
            return {"v": v - v_lower}

    return {}


def lambda_handler(event, context):
    config = [
        "KMS_KEY_TABLE",
        "KMS_KEY_ID",
        "LOG_LEVEL_SSM_PARAM",
        "RPC_ENDPOINT_SSM_PARAM",
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

    if operation == "sign_userop":
        """
        {
          "operation": "sign_userop",
          "userop_hash": "5033589a303c005b7e7818f4bf00e7361335f51f648be16c028951f90a1585d4",
          "key_id": "acb2ff44-db6a-4bf0-ad00-c499c64d676c",
          "sub": "68090fe5-1c30-4292-b92a-90e29afb35c4"
        }
        """
        userop_hash = event["userop_hash"]
        key_id = event["key_id"]
        sub = event["sub"]
        print(f"sign_op key_id: {key_id}")
        print(f"sign_op sub: {sub}")

        try:
            userop_hash_signature = sign_userop(userop_hash, key_id, sub)
        except Exception as e:
            raise Exception(f"exception happened signing userop_hash: {e}")

        return {"userop_hash_signature": userop_hash_signature}

    if operation == "sign_tx":
        """
        {
          "operation": "sign_tx",
          "tx_hash": "5033589a303c005b7e7818f4bf00e7361335f51f648be16c028951f90a1585d4",
          "key_id": "acb2ff44-db6a-4bf0-ad00-c499c64d676c",
          "sub": "68090fe5-1c30-4292-b92a-90e29afb35c4"
        }
        """

        tx_hash = event["tx_hash"]
        key_id = event["key_id"]
        sub = event["sub"]
        print(f"sign_tx key_id: {key_id}")
        print(f"sign_tx sub: {sub}")

        try:
            tx_hash_signature = sign_tx(tx_hash, key_id, sub)
        except Exception as e:
            raise Exception(f"exception happened signing tx_hash: {e}")

        return {"tx_hash_signature": tx_hash_signature}

    else:
        raise Exception(f"operation not supported: {operation}")
