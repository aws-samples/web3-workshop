// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as path from 'path'
import * as cdk from 'aws-cdk-lib';
import { Construct, } from 'constructs';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codePipeline from 'aws-cdk-lib/aws-codepipeline';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as codePipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codeBuild from 'aws-cdk-lib/aws-codebuild';

export class CiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // This assumes that the S3 bucket has been created
    // in the previous NFT pipeline
    const solidityS3BucketARN = ssm.StringParameter.fromStringParameterAttributes(this, 'SolidityS3BucketARN', {
      parameterName: '/app/assets/s3bucketurl'
    }).stringValue;

    const solidityS3Bucket = s3.Bucket.fromBucketArn(this, 'SolidityS3Bucket', solidityS3BucketARN);

    // Contract Repo
    const contractRepo = new codecommit.Repository(this, 'contractRepo', {
      repositoryName: "GenAINFT",
      code: codecommit.Code.fromDirectory('./repo', 'main')
    })

    //Contract Pipeline
    const contractPipeline = new codePipeline.Pipeline(this, 'contractPipeline', {
      artifactBucket: solidityS3Bucket,
    });

    const sourceStage = contractPipeline.addStage({ stageName: 'Source' });
    let sourceArtifact = new codePipeline.Artifact();
    sourceStage.addAction(new codePipelineActions.CodeCommitSourceAction({
      actionName: 'Source',
      output: sourceArtifact,
      repository: contractRepo,
      branch: 'main',
      codeBuildCloneOutput: true
    }));

    //Build and Deploy Contracts
    let contractABIArtifact = new codePipeline.Artifact('genAIABI');
    let codeCoverageArtifact = new codePipeline.Artifact('genAICOV');
    const buildProject = new codeBuild.PipelineProject(this, 'Build', {
      projectName: 'BuildGenAISmartContract',
      environment: {
        buildImage: codeBuild.LinuxBuildImage.fromAsset(this, 'foundryBuildImage', { directory: path.join('./', 'foundry') }),
        privileged: true
      },
      buildSpec: codeBuild.BuildSpec.fromSourceFilename('buildspec.yml'),


    });

    contractPipeline.addStage({
      stageName: 'Build',
      actions: [
        new codePipelineActions.CodeBuildAction({
          actionName: 'Build',
          project: buildProject,
          input: sourceArtifact,
          outputs: [contractABIArtifact, codeCoverageArtifact]
        }),
      ]
    });

    buildProject.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: [
          "codecommit:GetBranch",
          "codecommit:GetCommit",
          "codecommit:GetRepository",
          "codecommit:BatchGet*",
          "codecommit:BatchDescribe*",
          "codecommit:Describe*",
          "codecommit:Get*",
          "codecommit:List*",
          "codecommit:Merge*",
          "codecommit:Put*",
          "codecommit:Post*",
          "codecommit:GitPull",
          "codecommit:GitPush"
        ],
        resources: ["*"],
      })
    );

    new cdk.CfnOutput(this, 'GitRepoCloneUrlSsh', { value: contractRepo.repositoryCloneUrlSsh });
    new cdk.CfnOutput(this, 'GitRepoCloneUrlHttp', { value: contractRepo.repositoryCloneUrlHttp });
    new cdk.CfnOutput(this, 'GitRepoCloneUrlGrc', { value: contractRepo.repositoryCloneUrlGrc });
  }
}
