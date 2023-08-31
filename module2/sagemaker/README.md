
# Welcome to Stable Diffusion CDK Python project!

This project deploys a Stable diffusion model endpoint using AWS Sagemaker. It also adds a lambda and an API Gateway serve the endpoint.

## Usage: 
Sample HTTP request to the API Gateway:
```
POST /prod/generateimage HTTP/1.1
Host: <Host URL of the API Gateway>
x-api-key: <Retreive the key from AWS Console>
Cache-Control: no-cache
{
  "query": {
    "prompt": "surprize me",
    "negative_prompt": "(deformed iris, deformed pupils), (text), out of frame, low quality, jpeg artifacts, (bad art:1.1), plain, dull, (blurry:1.4), disfigured, bad art, deformed, poorly drawn, strange colors, blurry, boring, sketch, lacklustre, religious figure, religion, race, nudity, cropped",
    "width": 512,
    "height": 512,
    "num_images_per_prompt": 1,
    "num_inference_steps": 50,
    "guidance_scale": 7.5
  }
}

```

## Deployment Steps

To manually create a virtualenv on MacOS and Linux:

```
python3 -m venv .venv
```

After the init process completes and the virtualenv is created, you can use the following
step to activate your virtualenv.

```
source .venv/bin/activate
```

If you are a Windows platform, you would activate the virtualenv like this:

```
% .venv\Scripts\activate.bat
```

Once the virtualenv is activated, you can install the required dependencies.

```
pip install -r requirements.txt
```

At this point you can now synthesize the CloudFormation template for this code.

```
cdk synth
```

To add additional dependencies, for example other CDK libraries, just add
them to your `setup.py` file and rerun the `pip install -r requirements.txt`
command.

You can now deploy the code.
```
cdk deploy
```

The default instance count for inference is set to 1. The instance count can be changed by passing the instance_count_param 
```
cdk deploy --context instance_count_param=2
```


