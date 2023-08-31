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
    API_KEY = get_ssm_parameter("/app/sagemaker/endpoint/apikey")
    payload = {
        'query': input_payload
    }
    headers = {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
    }
    payload_json = json.dumps(payload)
    API_URL = get_ssm_parameter("/app/sagemaker/endpoint/apiurl")
    response = requests.post(API_URL, data=payload_json, headers=headers)
    query_response = response.content.decode('utf-8')
    
    if response.status_code != 200:
        print(f"status code: {response.status_code}")
        print(f"response: {query_response}")
        print(f"api key: {API_KEY}")
        print(f"api url: {API_URL}")
    
    return query_response


def parse_response(query_response):
    """Parse response and return generated image and the prompt"""
    response_dict = json.loads(query_response)
    images = response_dict["generated_images"]
    prompt = response_dict["prompt"]
    if isinstance(images[0], str):
        # Images are in JPEG format
        images = [base64.b64decode(img.encode()) for img in images]
        images = [Image.open(BytesIO(img)).convert("RGB") for img in images]
    else:
        # Images are in nested array format
        images = [np.array(img) for img in images]
        # adding RGB mnode for np arrays
        images = [Image.fromarray(np.uint8(img), mode='RGB') for img in images]
    return images, prompt


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
    input_payload = create_input_payload(event)
    query_response = query(input_payload)
    images, prompt = parse_response(query_response)
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
    negative_prompt = ", ".join(negative_words)
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
        "prompt": input_prompt,
        "negative_prompt": negative_prompt,
        "width": 512,
        "height": 512,
        "num_images_per_prompt": 1,
        "num_inference_steps": 50,
        "guidance_scale": 7.5,
        # "seed": 1,
    }
    return input_payload
