#!/usr/bin/env python3
"""
Complete AWS Deployment Script for Python REPL IDE Lambda
Handles: ECR Repository → Docker Build/Push → Lambda Function → Function URL

SECURITY NOTE: Configure AWS credentials via:
    - AWS CLI: aws configure
    - Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
    - IAM roles (recommended for EC2/ECS)
"""

import subprocess
import sys
import time
import os
import shutil

import boto3  # pylint: disable=import-error
from botocore.exceptions import ClientError  # pylint: disable=import-error

# Configuration
AWS_REGION = "us-west-2"
AWS_ACCOUNT = "415740581749"
ECR_REPO_NAME = "python-repl-container-lambda"
LAMBDA_FUNCTION_NAME = "lambda-python-repl"
IMAGE_TAG = "v1.0"
DOCKER_CONTEXT = "/Users/faddah/Documents/code/code - projects/code-canvas-astro"


class AWSDeployer:
    """AWS deployment orchestrator for Python REPL IDE Lambda function."""
    
    def __init__(self):
        # Initialize AWS clients (uses credential chain)
        self.ecr_client = boto3.client("ecr", region_name=AWS_REGION)
        self.lambda_client = boto3.client("lambda", region_name=AWS_REGION)
        self.iam_client = boto3.client("iam", region_name=AWS_REGION)
        self.ecr_uri = None
        self.image_uri = None

    def create_ecr_repository(self):
        """Create ECR repository"""
        print(f"\n📦 Creating ECR repository: {ECR_REPO_NAME}")

        try:
            response = self.ecr_client.create_repository(
                repositoryName=ECR_REPO_NAME,
                imageScanningConfiguration={"scanOnPush": True},
                imageTagMutability="MUTABLE",
            )
            self.ecr_uri = response["repository"]["repositoryUri"]
            print(f"✅ ECR repository created: {self.ecr_uri}")

            # Tag the repository
            self.ecr_client.tag_resource(
                resourceArn=response["repository"]["repositoryArn"],
                tags=[{"Key": "Version", "Value": IMAGE_TAG}],
            )

        except ClientError as e:
            if e.response["Error"]["Code"] == "RepositoryAlreadyExistsException":
                print("ℹ️  Repository already exists, using existing one")
                response = self.ecr_client.describe_repositories(
                    repositoryNames=[ECR_REPO_NAME]
                )
                self.ecr_uri = response["repositories"][0]["repositoryUri"]
            else:
                raise

        self.image_uri = f"{self.ecr_uri}:{IMAGE_TAG}"
        return self.ecr_uri

    def build_and_push_docker_image(self):
        """Build and push Docker image to ECR"""
        print("\n🐳 Building and pushing Docker image...")

        try:
            # Get ECR login password
            print("📝 Authenticating with ECR...")
            self.ecr_client.get_authorization_token()

            # Login to ECR
            ecr_endpoint = f"{AWS_ACCOUNT}.dkr.ecr.{AWS_REGION}.amazonaws.com"
            login_cmd = f"aws ecr get-login-password --region {AWS_REGION} | docker login --username AWS --password-stdin {ecr_endpoint}"
            subprocess.run(login_cmd, shell=True, check=True)

            # Build Docker image
            print(f"🔨 Building Docker image from {DOCKER_CONTEXT}...")
            
            # Copy Lambda dockerignore temporarily
            dockerignore_backup = None
            if os.path.exists(f"{DOCKER_CONTEXT}/.dockerignore"):
                dockerignore_backup = f"{DOCKER_CONTEXT}/.dockerignore.backup"
                shutil.copy(f"{DOCKER_CONTEXT}/.dockerignore", dockerignore_backup)
            
            if os.path.exists(f"{DOCKER_CONTEXT}/.dockerignore.lambda"):
                shutil.copy(f"{DOCKER_CONTEXT}/.dockerignore.lambda", f"{DOCKER_CONTEXT}/.dockerignore")
            
            try:
                # Build for amd64 with explicit docker output (not manifest)
                build_cmd = [
                    "docker",
                    "buildx",
                    "build",
                    "--platform",
                    "linux/amd64",
                    "--output",
                    "type=docker",
                    "-t",
                    f"{ECR_REPO_NAME}:{IMAGE_TAG}",
                    "-f",
                    f"{DOCKER_CONTEXT}/Dockerfile.lambda",
                    DOCKER_CONTEXT,
                ]
                subprocess.run(build_cmd, check=True)
            finally:
                # Restore original dockerignore
                if dockerignore_backup:
                    shutil.copy(dockerignore_backup, f"{DOCKER_CONTEXT}/.dockerignore")
                    os.remove(dockerignore_backup)

            # Tag for ECR
            print(f"🏷️  Tagging image: {self.image_uri}")
            tag_cmd = ["docker", "tag", f"{ECR_REPO_NAME}:{IMAGE_TAG}", self.image_uri]
            subprocess.run(tag_cmd, check=True)

            # Push to ECR
            print("⬆️  Pushing to ECR...")
            push_cmd = ["docker", "push", self.image_uri]
            subprocess.run(push_cmd, check=True)

            print(f"✅ Docker image pushed: {self.image_uri}")
            return self.image_uri

        except subprocess.CalledProcessError as e:
            print(f"❌ Docker operation failed: {e}")
            sys.exit(1)

    def create_lambda_execution_role(self):
        """Create IAM role for Lambda execution"""
        role_name = f"{LAMBDA_FUNCTION_NAME}-role"
        print(f"\n🔐 Creating Lambda execution role: {role_name}")

        trust_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"Service": "lambda.amazonaws.com"},
                    "Action": "sts:AssumeRole",
                }
            ],
        }

        try:
            response = self.iam_client.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=str(trust_policy).replace("'", '"'),
                Description="Execution role for Python REPL Lambda function",
            )
            role_arn = response["Role"]["Arn"]

            # Attach basic execution policy
            self.iam_client.attach_role_policy(
                RoleName=role_name,
                PolicyArn="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            )

            # Wait for role to be available
            print("⏳ Waiting for IAM role to propagate...")
            time.sleep(10)

            print(f"✅ IAM role created: {role_arn}")
            return role_arn

        except ClientError as e:
            if e.response["Error"]["Code"] == "EntityAlreadyExists":
                print("ℹ️  Role already exists, using existing one")
                response = self.iam_client.get_role(RoleName=role_name)
                return response["Role"]["Arn"]
            else:
                raise

    def create_lambda_function(self, role_arn):
        """Create Lambda function from container image"""
        print(f"\n⚡ Creating Lambda function: {LAMBDA_FUNCTION_NAME}")

        try:
            response = self.lambda_client.create_function(
                FunctionName=LAMBDA_FUNCTION_NAME,
                Role=role_arn,
                Code={"ImageUri": self.image_uri},
                PackageType="Image",
                Timeout=30,
                MemorySize=512,
                Environment={"Variables": {"NODE_ENV": "production"}},
            )

            function_arn = response["FunctionArn"]
            print(f"✅ Lambda function created: {function_arn}")
            return function_arn

        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceConflictException":
                print("ℹ️  Function already exists, updating code...")
                self.lambda_client.update_function_code(
                    FunctionName=LAMBDA_FUNCTION_NAME, ImageUri=self.image_uri
                )
                response = self.lambda_client.get_function(
                    FunctionName=LAMBDA_FUNCTION_NAME
                )
                return response["Configuration"]["FunctionArn"]
            else:
                raise

    def create_function_url(self):
        """Create Lambda Function URL with CORS"""
        print("\n🌐 Creating Function URL with CORS...")

        try:
            response = self.lambda_client.create_function_url_config(
                FunctionName=LAMBDA_FUNCTION_NAME,
                AuthType="NONE",
                Cors={
                    "AllowOrigins": ["*"],
                    "AllowMethods": ["*"],
                    "AllowHeaders": ["*"],
                    "MaxAge": 86400,
                },
            )

            function_url = response["FunctionUrl"]
            print(f"✅ Function URL created: {function_url}")

            # Add permission for public access
            try:
                self.lambda_client.add_permission(
                    FunctionName=LAMBDA_FUNCTION_NAME,
                    StatementId="FunctionURLAllowPublicAccess",
                    Action="lambda:InvokeFunctionUrl",
                    Principal="*",
                    FunctionUrlAuthType="NONE",
                )
            except ClientError as e:
                if e.response["Error"]["Code"] != "ResourceConflictException":
                    raise

            return function_url

        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceConflictException":
                print("ℹ️  Function URL already exists")
                response = self.lambda_client.get_function_url_config(
                    FunctionName=LAMBDA_FUNCTION_NAME
                )
                return response["FunctionUrl"]
            else:
                raise

    def deploy(self):
        """Execute full deployment pipeline"""
        print("=" * 80)
        print("🚀 AWS Lambda Container Deployment for Python REPL IDE")
        print("=" * 80)
        print(f"📍 Region: {AWS_REGION}")
        print(f"🔑 Account: {AWS_ACCOUNT}")
        print("=" * 80)

        try:
            # Step 1: Create ECR repository
            ecr_uri = self.create_ecr_repository()

            # Step 2: Build and push Docker image
            image_uri = self.build_and_push_docker_image()

            # Step 3: Create Lambda execution role
            role_arn = self.create_lambda_execution_role()

            # Step 4: Create Lambda function
            function_arn = self.create_lambda_function(role_arn)

            # Step 5: Create Function URL
            function_url = self.create_function_url()

            # Print summary
            self.print_summary(ecr_uri, image_uri, function_url)

        except Exception as e:
            print(f"\n❌ Deployment failed: {e}")
            sys.exit(1)

    def print_summary(self, ecr_uri, image_uri, function_url):
        """Print deployment summary"""
        print("\n" + "=" * 80)
        print("✅ DEPLOYMENT SUCCESSFUL!")
        print("=" * 80)
        print(f"- AWS ECR Repository Created:               {ECR_REPO_NAME}:{IMAGE_TAG}")
        print(f"- AWS ECR Repository {ECR_REPO_NAME} URI web address:               {ecr_uri}")
        print(f"- Docker Image uploaded to that AWS ECR Repository:               {ECR_REPO_NAME}:{IMAGE_TAG}")
        print(f"- AWS Lambda Function Created:               {LAMBDA_FUNCTION_NAME}")
        print(f"- AWS Lambda Function URL:                {function_url}")
        print("=" * 80)


def main():
    """Main entry point"""
    deployer = AWSDeployer()
    deployer.deploy()


if __name__ == "__main__":
    main()
