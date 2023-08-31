#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: MIT-0
import boto3
import os
import logging
import asn1tools
import base64
import uuid
from web3.auto import w3

session = boto3.session.Session()
client_kms = boto3.client("kms")
client_ssm = boto3.client("ssm")
kms_key_id = os.getenv("KMS_KEY_ID")

logger = logging.getLogger()


def calc_eth_address(pub_key: bytes) -> str:
    SUBJECT_ASN = """
    Key DEFINITIONS ::= BEGIN

    SubjectPublicKeyInfo  ::=  SEQUENCE  {
       algorithm         AlgorithmIdentifier,
       subjectPublicKey  BIT STRING
     }

    AlgorithmIdentifier  ::=  SEQUENCE  {
        algorithm   OBJECT IDENTIFIER,
        parameters  ANY DEFINED BY algorithm OPTIONAL
      }

    END
    """

    key = asn1tools.compile_string(SUBJECT_ASN)
    key_decoded = key.decode("SubjectPublicKeyInfo", pub_key)

    pub_key_raw = key_decoded["subjectPublicKey"][0]
    pub_key = pub_key_raw[1 : len(pub_key_raw)]

    # https://www.oreilly.com/library/view/mastering-ethereum/9781491971932/ch04.html
    hex_address = w3.keccak(bytes(pub_key)).hex()
    eth_address = "0x{}".format(hex_address[-40:])

    eth_checksum_addr = w3.to_checksum_address(eth_address)

    return eth_checksum_addr


def lambda_handler(event, context):
    try:
        log_level = client_ssm.get_parameter(Name=os.environ["LOG_LEVEL_SSM_PARAM"])
    except Exception as e:
        raise e
    else:
        logger.setLevel(log_level["Parameter"]["Value"])

    logger.debug(f"incoming event: {event}")

    sub = event.get("sub")
    if not sub:
        raise Exception("sub parameter missing in request")

    try:
        data_key_pair = client_kms.generate_data_key_pair_without_plaintext(
            EncryptionContext={"sub": sub},
            KeyId=kms_key_id,
            KeyPairSpec="ECC_SECG_P256K1",
        )
    except Exception as e:
        logger.error(
            f"exception happened generating data_key_pair without plaintext: {e}"
        )
        raise

    try:
        checksum_address = calc_eth_address(data_key_pair["PublicKey"])
    except Exception as e:
        logger.error(
            f"exception happened calculating public Ethereum address from public key: {e}"
        )
        raise

    try:
        ciphertext_b64 = base64.standard_b64encode(
            data_key_pair["PrivateKeyCiphertextBlob"]
        ).decode("utf-8")
    except Exception as e:
        logger.error(
            f"exception happened encoding ciphertext blob as base64 encoded string: {e}"
        )
        raise

    return {
        "ciphertext": ciphertext_b64,
        "address": checksum_address,
        "key_id": str(uuid.uuid4()),
        "backend": "kms",
    }
