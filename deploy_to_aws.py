#!/usr/bin/env python3
"""
AWS CDK Script to deploy Python REPL IDE to Lambda with Container Image
SECURITY: Uses AWS credential chain (no hardcoded credentials)
"""

import os
import subprocess
from aws_cdk import (
    App,
    Stack,
    CfnOutput,
    aws_ecr as ecr,
    aws_lambda as lambda_,
    aws_iam as iam,
)
from constructs import Construct

# Configuration
AWS_REGION = "us-west-2"
AWS_ACCOUNT = "<account_id>"  # Set via environment or CLI
ECR_REPO_NAME = "python-repl-container-lambda"
LAMBDA_FUNCTION_NAME = "lambda-python-repl"
IMAGE_TAG = "v1.0"
DOCKER_CONTEXT = "/Users/faddah/Documents/code/code - projects/code-canvas-astro"


class PythonReplLambdaStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Create ECR Repository
        ecr_repo = ecr.Repository(
            self,
            "PythonReplECRRepo",
            repository_name=ECR_REPO_NAME,
            removal_policy=ecr.RemovalPolicy.RETAIN,
        )

        # Tag the repository
        ecr_repo.node.add_metadata("tag", IMAGE_TAG)

        # Create Lambda execution role
        lambda_role = iam.Role(
            self,
            "LambdaExecutionRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaBasicExecutionRole"
                )
            ],
        )

        # Create Lambda function from container image
        lambda_function = lambda_.DockerImageFunction(
            self,
            "PythonReplLambda",
            function_name=LAMBDA_FUNCTION_NAME,
            code=lambda_.DockerImageCode.from_ecr(
                repository=ecr_repo,
                tag_or_digest=IMAGE_TAG,
            ),
            role=lambda_role,
            timeout=lambda_.Duration.seconds(30),
            memory_size=512,
        )

        # Create Function URL with CORS
        function_url = lambda_function.add_function_url(
            auth_type=lambda_.FunctionUrlAuthType.NONE,
            cors=lambda_.FunctionUrlCorsOptions(
                allowed_origins=["*"],
                allowed_methods=[lambda_.HttpMethod.ALL],
                allowed_headers=["*"],
            ),
        )

        # Outputs
        CfnOutput(
            self,
            "ECRRepositoryName",
            value=f"{ECR_REPO_NAME}:{IMAGE_TAG}",
            description="ECR Repository Name with Tag",
        )

        CfnOutput(
            self,
            "ECRRepositoryURI",
            value=ecr_repo.repository_uri,
            description="ECR Repository URI",
        )

        CfnOutput(
            self,
            "LambdaFunctionName",
            value=lambda_function.function_name,
            description="Lambda Function Name",
        )

        CfnOutput(
            self,
            "LambdaFunctionURL",
            value=function_url.url,
            description="Lambda Function URL",
        )


def build_and_push_docker_image(account_id: str, region: str):
    """Build and push Docker image to ECR"""
    print("\n🐳 Building and pushing Docker image to ECR...")

    ecr_uri = f"{account_id}.dkr.ecr.{region}.amazonaws.com"
    full_image_name = f"{ecr_uri}/{ECR_REPO_NAME}:{IMAGE_TAG}"

    try:
        # Login to ECR
        print(f"📝 Logging into ECR...")
        subprocess.run(
            f"aws ecr get-login-password --region {region} | "
            f"docker login --username AWS --password-stdin {ecr_uri}",
            shell=True,
            check=True,
        )

        # Build Docker image
        print(f"🔨 Building Docker image...")
        subprocess.run(
            [
                "docker",
                "build",
                "-t",
                f"{ECR_REPO_NAME}:{IMAGE_TAG}",
                "-f",
                f"{DOCKER_CONTEXT}/Dockerfile",
                DOCKER_CONTEXT,
            ],
            check=True,
        )

        # Tag image for ECR
        print(f"🏷️  Tagging image for ECR...")
        subprocess.run(
            ["docker", "tag", f"{ECR_REPO_NAME}:{IMAGE_TAG}", full_image_name],
            check=True,
        )

        # Push to ECR
        print(f"⬆️  Pushing image to ECR...")
        subprocess.run(["docker", "push", full_image_name], check=True)

        print(f"✅ Docker image pushed successfully: {full_image_name}")
        return full_image_name

    except subprocess.CalledProcessError as e:
        print(f"❌ Error during Docker build/push: {e}")
        raise


def main():
    """Main deployment function"""
    # Get AWS account from environment or use default
    account_id = os.environ.get("CDK_DEFAULT_ACCOUNT", AWS_ACCOUNT)
    region = AWS_REGION

    print("=" * 70)
    print("🚀 AWS Lambda Container Deployment for Python REPL IDE")
    print("=" * 70)
    print(f"📍 Region: {region}")
    print(f"🔑 Account: {account_id}")
    print("=" * 70)

    # Initialize CDK app
    app = App()

    # Create stack
    stack = PythonReplLambdaStack(
        app,
        "PythonReplLambdaStack",
        env={"account": account_id, "region": region},
    )

    # Synthesize CloudFormation template
    print("\n📦 Synthesizing CDK stack...")
    app.synth()

    print("\n✅ CDK synthesis complete!")
    print("\n📋 Next steps:")
    print("1. Deploy the stack: cdk deploy")
    print("2. Build and push Docker image (see build_and_push_docker_image function)")
    print("3. Update Lambda function to use the new image")


if __name__ == "__main__":
    main()
