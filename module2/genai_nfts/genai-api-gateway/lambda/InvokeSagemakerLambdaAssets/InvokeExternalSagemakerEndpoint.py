# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import boto3
import json
import numpy as np
from io import BytesIO
import base64
import uuid
import random
import yaml
import requests
import os
import traceback
import jwt
import botocore.exceptions

s3 = boto3.client('s3')

try:
    import Image
except ImportError:
    from PIL import Image

with open('config.yml') as f:
    config = yaml.safe_load(f)
    art_list = config['art_list']
    beauty_words = config['beauty_words']
    negative_words = config['negative_words']
    surprise_words = config['surprise_words']
    model_endpoint_name_key = config['model_endpoint_name_key'][0]

bucket_name = os.environ.get('BUCKET_NAME')


def lambda_handler(event, context):
    try:
        print(event)
        s3_urls, input_payload = process_text(event)
        prompt = event['prompt']
        jwtBase64 = event['jwt'][7:]  # Remove 'Bearer ' at the start
        jwtToken = jwt.decode(jwtBase64, algorithms=["RS256"], options={"verify_signature": False})
        print(f"jwt: {jwtToken}")
        response = {
            "statusCode": 200,
            "body": json.dumps({
                "s3_urls": s3_urls,
                "prompt": prompt,
                "Sagemaker_input": input_payload["prompt"],
                "ownerAddress": jwtToken['public_address'],
                "walletAddress": jwtToken['account_address'],
                "userKeyId": jwtToken['key_id'],
                "sub": jwtToken['sub']
            })
        }

    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()  # Print the detailed exception log
        response = {
            "statusCode": 500,
            "body": json.dumps({
                "message": "Internal Server Error"
            })
        }
    response['body'] = json.loads(response['body'])
    return response


def get_ssm_parameter(key) -> str:
    ssm_client = boto3.client('ssm')

    try:
        response = ssm_client.get_parameter(
            Name=key
        )
    except botocore.exceptions.ClientError as error:
        raise error

    return response["Parameter"]["Value"]


def query(input_payload):
    client = boto3.client('bedrock-runtime')
    response = client.invoke_model(
        accept='application/json',
        body=json.dumps(input_payload),
        contentType='application/json',
        modelId='stability.stable-diffusion-xl-v0'
    )

   # query_response = response.content.decode('utf-8')
    
    status_code = response["ResponseMetadata"]["HTTPStatusCode"]
    response_body = response.get("body").read()
    if status_code != 200:
        print(f"status code: {status_code}")
        print(f"response: {response}")
    
    
    
    return response_body


def parse_response(query_response):
    """Parse response and return generated image and the prompt"""
    response_dict = json.loads(query_response)
    images_artifacts = response_dict.get("artifacts")
    
    images_decoded = [base64.b64decode(img['base64'].encode()) for img in images_artifacts if 'base64' in img]
    images = [Image.open(BytesIO(img)).convert("RGB") for img in images_decoded]
    
    return images


def upload_image_to_s3(img, prompt):
    """
    Uploads image to S3 bucket.
    This logical flow is used because we are parsing the
    response as application/text 'utf-8'. The model is also
    capable of providing the response as application/json;jpeg
    in which case this function will be written differently

    """
    s3 = boto3.resource('s3')
    img_byte_arr = BytesIO()
    img = Image.fromarray(np.uint8(img))
    img.save(img_byte_arr, format='JPEG')
    ## modified because we want to use UUID to generate image name
    object_key = f"pre-conf/{str(uuid.uuid4())}.jpg"
    s3.Object(bucket_name, object_key).put(Body=img_byte_arr.getvalue())
    s3_url = f"https://{bucket_name}.s3.amazonaws.com/{object_key}"
    return s3_url


def process_text(event):
    """
    The actual processing event. Takes the payload
    and invokes the endpoint to create the final image
    which is then uploaded to S3

    """
    input_payload, prompt = create_input_payload(event)
    query_response = query(input_payload)
    images = parse_response(query_response)

    s3_urls = []
    for image in images:
        s3_url = upload_image_to_s3(image, prompt)
        s3_urls.append(s3_url)
    print('s3_urls')
    print(s3_urls[0])
    return s3_urls, input_payload


def create_input_payload(event):
    """
    the payload 'enriching' process. We are adding arguments to
    the user-provided input to make the image 'vibrant' and more
    appealing to the eye as well as providing negative prompts
    to make sure that the model does not produce images that
    are malformed or inappropriate

    if not flag:
        then do nothing
    else:
        create payload
    """
    beautify_args = ", ".join(beauty_words)
    art_style = ", ".join(random.sample(art_list, 3))
    surprise_word = random.sample(surprise_words, 1)[0]
    # logic for --beautify
    if '--beautify' in event['prompt']:
        # beautify_args = ", ".join(beauty_words)
        # art_style = ", ".join(random.sample(art_list, 3))
        input_prompt = event['prompt'].replace('--beautify', f" art style of {art_style}" + beautify_args)
    # logic for surprise-me
    elif 'surprise-me' in event['prompt']:
        # beautify_args = ", ".join(beauty_words)
        # art_style = ", ".join(random.sample(art_list, 3))
        # surprise_word = random.sample(surprise_words, 1)[0]
        input_prompt = surprise_word + " " + beautify_args + " " + f"art style of {art_style}"
    # user-driven input
    else:
        input_prompt = event['prompt']
    

    input_payload = {
        "text_prompts":[
            {"text":input_prompt}
        ],
        "cfg_scale":7.5,
        #"seed":0,
        "steps":50
    }
    return input_payload, input_prompt


import boto3
import json
client = boto3.client('bedrock-runtime')
input_prompt = "car flying in space"
input_payload = {
    "text_prompts":[
        {"text":input_prompt}
        ],
        "cfg_scale":7.5,
        #"seed":0,
        "steps":50
        }
response = client.invoke_model(
    accept='application/json',
    body=json.dumps(input_payload),
    contentType='application/json',
    modelId='stability.stable-diffusion-xl-v0'
)