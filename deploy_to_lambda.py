#!/usr/bin/env python3
"""
AWS Lambda Deployment Script for Code Canvas Astro with S3 Database Persistence
Handles: S3 Bucket → ECR Repository → Docker Build/Push → Lambda Function → Function URL

Features:
- Creates S3 bucket for SQLite database persistence
- Creates/updates ECR repository: python-repl-container-lambda:v1.2
- Builds and pushes Lambda-compatible Docker image
- Creates/updates Lambda function with container image
- Configures S3 permissions for database access
- Creates Function URL for public access
- Returns deployment status and public URL

Database Persistence:
- SQLite database stored in S3 bucket
- Downloaded to Lambda /tmp on cold start
- Uploaded back to S3 after write operations
- Truly persistent across all invocations

SECURITY: Uses AWS credential chain (no hardcoded credentials)
Configure via: aws configure or environment variables

Usage:
    python3 deploy_to_lambda.py
"""

import subprocess
import sys
import time
import os
import json
from typing import Dict, Optional

import boto3
from botocore.exceptions import ClientError

# ============================================================================
# CONFIGURATION
# ============================================================================
AWS_REGION = "us-west-2"
AWS_ACCOUNT = "415740581749"
ECR_REPO_NAME = "python-repl-container-lambda"
LAMBDA_FUNCTION_NAME = "code-canvas-astro-lambda"
S3_BUCKET_NAME = "code-canvas-astro-db"
S3_DB_KEY = "database/taskManagement.db"
IMAGE_TAG = "v1.2"
DOCKER_CONTEXT = "/Users/faddah/Documents/code/code - projects/code-canvas-astro"

# Lambda configuration
LAMBDA_CONFIG = {
    "memory": 2048,  # MB (more memory = more CPU)
    "timeout": 900,  # seconds (15 minutes max)
    "ephemeral_storage": 1024,  # MB for /tmp
}


class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


class LambdaDeployer:
    """AWS Lambda deployment orchestrator with S3 database persistence"""

    def __init__(self):
        """Initialize AWS clients and configuration"""
        self.ecr_client = boto3.client("ecr", region_name=AWS_REGION)
        self.lambda_client = boto3.client("lambda", region_name=AWS_REGION)
        self.s3_client = boto3.client("s3", region_name=AWS_REGION)
        self.iam_client = boto3.client("iam", region_name=AWS_REGION)

        self.ecr_uri = None
        self.image_uri = None
        self.s3_bucket_created = False

    # ========================================================================
    # Terminal Output Helpers
    # ========================================================================

    def print_step(self, step_num: int, total: int, message: str):
        """Print step header"""
        print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * 80}")
        print(f"Step {step_num}/{total}: {message}")
        print(f"{'=' * 80}{Colors.ENDC}")

    def print_success(self, message: str):
        """Print success message"""
        print(f"{Colors.OKGREEN}✅ SUCCESS: {message}{Colors.ENDC}")

    def print_fail(self, message: str, error: Optional[Exception] = None):
        """Print failure message with error details"""
        print(f"{Colors.FAIL}❌ FAIL: {message}{Colors.ENDC}")
        if error:
            print(f"{Colors.FAIL}   Error Details: {str(error)}{Colors.ENDC}")
            if hasattr(error, 'response'):
                error_code = error.response.get('Error', {}).get('Code', 'Unknown')
                error_msg = error.response.get('Error', {}).get('Message', 'No details')
                print(f"{Colors.FAIL}   Error Code: {error_code}{Colors.ENDC}")
                print(f"{Colors.FAIL}   Error Message: {error_msg}{Colors.ENDC}")

    def print_info(self, message: str):
        """Print info message"""
        print(f"{Colors.OKCYAN}ℹ️  INFO: {message}{Colors.ENDC}")

    def print_progress(self, message: str):
        """Print progress message"""
        print(f"{Colors.OKBLUE}🔄 {message}{Colors.ENDC}")

    # ========================================================================
    # Step 1: S3 Bucket for Database
    # ========================================================================

    def create_s3_bucket(self) -> bool:
        """Create S3 bucket for SQLite database storage"""
        try:
            self.print_progress(f"Setting up S3 bucket: {S3_BUCKET_NAME}")

            try:
                # Check if bucket already exists
                self.s3_client.head_bucket(Bucket=S3_BUCKET_NAME)
                self.print_info(f"S3 bucket already exists: {S3_BUCKET_NAME}")
                self.s3_bucket_created = True
                return True

            except ClientError as e:
                error_code = e.response['Error']['Code']
                if error_code == '404':
                    # Bucket doesn't exist, create it
                    if AWS_REGION == 'us-east-1':
                        self.s3_client.create_bucket(Bucket=S3_BUCKET_NAME)
                    else:
                        self.s3_client.create_bucket(
                            Bucket=S3_BUCKET_NAME,
                            CreateBucketConfiguration={'LocationConstraint': AWS_REGION}
                        )

                    self.print_success(f"S3 bucket created: {S3_BUCKET_NAME}")

                    # Enable versioning for safety
                    self.s3_client.put_bucket_versioning(
                        Bucket=S3_BUCKET_NAME,
                        VersioningConfiguration={'Status': 'Enabled'}
                    )
                    self.print_success("Bucket versioning enabled")

                    # Add encryption
                    self.s3_client.put_bucket_encryption(
                        Bucket=S3_BUCKET_NAME,
                        ServerSideEncryptionConfiguration={
                            'Rules': [{
                                'ApplyServerSideEncryptionByDefault': {
                                    'SSEAlgorithm': 'AES256'
                                }
                            }]
                        }
                    )
                    self.print_success("Bucket encryption enabled")

                    # Tag bucket
                    self.s3_client.put_bucket_tagging(
                        Bucket=S3_BUCKET_NAME,
                        Tagging={
                            'TagSet': [
                                {'Key': 'Project', 'Value': 'CodeCanvasAstro'},
                                {'Key': 'Purpose', 'Value': 'SQLiteDatabase'},
                                {'Key': 'ManagedBy', 'Value': 'LambdaDeploymentScript'}
                            ]
                        }
                    )

                    self.s3_bucket_created = True
                    return True
                else:
                    raise

        except Exception as e:
            self.print_fail("Failed to create S3 bucket", e)
            return False

    # ========================================================================
    # Step 2: ECR Repository Management
    # ========================================================================

    def create_ecr_repository(self) -> bool:
        """Create or get existing ECR repository"""
        try:
            self.print_progress(f"Setting up ECR repository: {ECR_REPO_NAME}")

            try:
                response = self.ecr_client.create_repository(
                    repositoryName=ECR_REPO_NAME,
                    imageScanningConfiguration={"scanOnPush": True},
                    imageTagMutability="MUTABLE",
                )
                self.ecr_uri = response["repository"]["repositoryUri"]
                self.print_success(f"ECR repository created: {self.ecr_uri}")

            except ClientError as e:
                if e.response["Error"]["Code"] == "RepositoryAlreadyExistsException":
                    self.print_info("Repository already exists, using existing one")
                    response = self.ecr_client.describe_repositories(
                        repositoryNames=[ECR_REPO_NAME]
                    )
                    self.ecr_uri = response["repositories"][0]["repositoryUri"]
                else:
                    raise

            self.image_uri = f"{self.ecr_uri}:{IMAGE_TAG}"
            self.print_success(f"Image URI: {self.image_uri}")
            return True

        except Exception as e:
            self.print_fail("Failed to create/get ECR repository", e)
            return False

    # ========================================================================
    # Step 3: Docker Image Build and Push
    # ========================================================================

    def build_and_push_docker_image(self) -> bool:
        """Build and push Docker image to ECR"""
        try:
            self.print_progress("Building and pushing Docker image...")

            # Login to ECR
            self.print_progress("Authenticating with ECR...")
            ecr_endpoint = f"{AWS_ACCOUNT}.dkr.ecr.{AWS_REGION}.amazonaws.com"
            login_cmd = (
                f"aws ecr get-login-password --region {AWS_REGION} | "
                f"docker login --username AWS --password-stdin {ecr_endpoint}"
            )
            subprocess.run(login_cmd, shell=True, check=True, capture_output=True)
            self.print_success("ECR authentication successful")

            # Build Docker image for Lambda
            self.print_progress(f"Building Lambda Docker image from {DOCKER_CONTEXT}...")
            self.print_info("This may take several minutes...")
            self.print_info("Using Lambda-compatible build flags (disabling provenance/sbom)...")

            # Use docker buildx with Lambda-compatible flags
            # --provenance=false and --sbom=false prevent incompatible manifest formats
            build_cmd = [
                "docker",
                "buildx",
                "build",
                "--platform",
                "linux/amd64",
                "--provenance=false",
                "--sbom=false",
                "--load",
                "-t",
                f"{ECR_REPO_NAME}:{IMAGE_TAG}",
                "-f",
                f"{DOCKER_CONTEXT}/Dockerfile.lambda",
                DOCKER_CONTEXT,
            ]
            subprocess.run(build_cmd, check=True, capture_output=True)
            self.print_success("Docker image built successfully")

            # Tag for ECR
            self.print_progress(f"Tagging image: {self.image_uri}")
            tag_cmd = ["docker", "tag", f"{ECR_REPO_NAME}:{IMAGE_TAG}", self.image_uri]
            subprocess.run(tag_cmd, check=True, capture_output=True)
            self.print_success("Image tagged for ECR")

            # Push to ECR
            self.print_progress("Pushing to ECR (this may take a few minutes)...")
            push_cmd = ["docker", "push", self.image_uri]
            subprocess.run(push_cmd, check=True, capture_output=True)
            self.print_success(f"Docker image pushed to ECR: {self.image_uri}")

            return True

        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.decode() if e.stderr else str(e)
            self.print_fail(f"Docker operation failed: {error_msg}")
            return False
        except Exception as e:
            self.print_fail("Unexpected error during Docker build/push", e)
            return False

    # ========================================================================
    # Step 4: IAM Role Creation
    # ========================================================================

    def create_lambda_execution_role(self) -> Optional[str]:
        """Create IAM role for Lambda execution with S3 access"""
        role_name = f"{LAMBDA_FUNCTION_NAME}-role"

        try:
            self.print_progress(f"Setting up IAM execution role: {role_name}")

            trust_policy = {
                "Version": "2012-10-17",
                "Statement": [{
                    "Effect": "Allow",
                    "Principal": {"Service": "lambda.amazonaws.com"},
                    "Action": "sts:AssumeRole"
                }]
            }

            try:
                response = self.iam_client.create_role(
                    RoleName=role_name,
                    AssumeRolePolicyDocument=json.dumps(trust_policy),
                    Description="Lambda execution role for Code Canvas Astro with S3 database access"
                )
                role_arn = response["Role"]["Arn"]
                self.print_success(f"IAM role created: {role_arn}")

                # Attach basic Lambda execution policy
                self.iam_client.attach_role_policy(
                    RoleName=role_name,
                    PolicyArn="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
                )
                self.print_success("Attached AWSLambdaBasicExecutionRole policy")

                # Add S3 access policy for database bucket
                s3_policy = {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Action": [
                                "s3:GetObject",
                                "s3:PutObject",
                                "s3:HeadObject"
                            ],
                            "Resource": f"arn:aws:s3:::{S3_BUCKET_NAME}/*"
                        },
                        {
                            "Effect": "Allow",
                            "Action": [
                                "s3:ListBucket"
                            ],
                            "Resource": f"arn:aws:s3:::{S3_BUCKET_NAME}"
                        }
                    ]
                }
                self.iam_client.put_role_policy(
                    RoleName=role_name,
                    PolicyName="S3DatabaseAccessPolicy",
                    PolicyDocument=json.dumps(s3_policy)
                )
                self.print_success("Attached S3 database access policy")

                # Wait for role propagation
                self.print_progress("Waiting for IAM role to propagate...")
                time.sleep(10)

                return role_arn

            except ClientError as e:
                if e.response["Error"]["Code"] == "EntityAlreadyExists":
                    self.print_info("Role already exists, using existing one")
                    response = self.iam_client.get_role(RoleName=role_name)
                    role_arn = response["Role"]["Arn"]

                    # Update inline policy for S3 access
                    s3_policy = {
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Effect": "Allow",
                                "Action": [
                                    "s3:GetObject",
                                    "s3:PutObject",
                                    "s3:HeadObject"
                                ],
                                "Resource": f"arn:aws:s3:::{S3_BUCKET_NAME}/*"
                            },
                            {
                                "Effect": "Allow",
                                "Action": [
                                    "s3:ListBucket"
                                ],
                                "Resource": f"arn:aws:s3:::{S3_BUCKET_NAME}"
                            }
                        ]
                    }
                    self.iam_client.put_role_policy(
                        RoleName=role_name,
                        PolicyName="S3DatabaseAccessPolicy",
                        PolicyDocument=json.dumps(s3_policy)
                    )
                    self.print_success("Updated S3 database access policy")

                    return role_arn
                else:
                    raise

        except Exception as e:
            self.print_fail("Failed to create Lambda execution role", e)
            return None

    # ========================================================================
    # Step 5: Lambda Function Creation/Update
    # ========================================================================

    def create_or_update_lambda_function(self, role_arn: str) -> Optional[str]:
        """Create or update Lambda function"""
        try:
            self.print_progress(f"Deploying Lambda function: {LAMBDA_FUNCTION_NAME}")

            function_config = {
                "FunctionName": LAMBDA_FUNCTION_NAME,
                "Role": role_arn,
                "Code": {"ImageUri": self.image_uri},
                "PackageType": "Image",
                "Timeout": LAMBDA_CONFIG["timeout"],
                "MemorySize": LAMBDA_CONFIG["memory"],
                "EphemeralStorage": {"Size": LAMBDA_CONFIG["ephemeral_storage"]},
                "Environment": {
                    "Variables": {
                        "NODE_ENV": "production",
                        "S3_BUCKET_NAME": S3_BUCKET_NAME,
                        "S3_DB_KEY": S3_DB_KEY,
                        "PORT": "8080",
                        "DATABASE_URL": "file:/tmp/taskManagement.db"
                    }
                }
            }

            try:
                # Try to create new function
                response = self.lambda_client.create_function(**function_config)
                function_arn = response["FunctionArn"]
                self.print_success(f"Lambda function created: {function_arn}")

            except ClientError as e:
                if e.response["Error"]["Code"] == "ResourceConflictException":
                    self.print_info("Function already exists, updating...")

                    # Update function code
                    self.print_progress("Updating function code...")
                    self.lambda_client.update_function_code(
                        FunctionName=LAMBDA_FUNCTION_NAME,
                        ImageUri=self.image_uri
                    )
                    self.print_success("Function code updated")

                    # Wait for update to complete
                    self.print_progress("Waiting for code update to complete...")
                    waiter = self.lambda_client.get_waiter("function_updated")
                    waiter.wait(FunctionName=LAMBDA_FUNCTION_NAME)

                    # Update function configuration
                    self.print_progress("Updating function configuration...")
                    self.lambda_client.update_function_configuration(
                        FunctionName=LAMBDA_FUNCTION_NAME,
                        Role=role_arn,
                        Timeout=LAMBDA_CONFIG["timeout"],
                        MemorySize=LAMBDA_CONFIG["memory"],
                        EphemeralStorage={"Size": LAMBDA_CONFIG["ephemeral_storage"]},
                        Environment=function_config["Environment"]
                    )
                    self.print_success("Function configuration updated")

                    # Wait for configuration update
                    self.print_progress("Waiting for configuration update to complete...")
                    waiter = self.lambda_client.get_waiter("function_updated")
                    waiter.wait(FunctionName=LAMBDA_FUNCTION_NAME)

                    response = self.lambda_client.get_function(FunctionName=LAMBDA_FUNCTION_NAME)
                    function_arn = response["Configuration"]["FunctionArn"]
                else:
                    raise

            self.print_success(f"Lambda function ready: {function_arn}")
            return function_arn

        except Exception as e:
            self.print_fail("Failed to create/update Lambda function", e)
            return None

    # ========================================================================
    # Step 6: Function URL Creation
    # ========================================================================

    def create_function_url(self) -> Optional[str]:
        """Create Lambda Function URL for public access"""
        try:
            self.print_progress("Creating Lambda Function URL...")

            try:
                response = self.lambda_client.create_function_url_config(
                    FunctionName=LAMBDA_FUNCTION_NAME,
                    AuthType="NONE",
                    Cors={
                        "AllowOrigins": ["*"],
                        "AllowMethods": ["*"],
                        "AllowHeaders": ["*"],
                        "MaxAge": 86400
                    }
                )
                function_url = response["FunctionUrl"]
                self.print_success(f"Function URL created: {function_url}")

                # Add permission for public access
                try:
                    self.lambda_client.add_permission(
                        FunctionName=LAMBDA_FUNCTION_NAME,
                        StatementId="FunctionURLAllowPublicAccess",
                        Action="lambda:InvokeFunctionUrl",
                        Principal="*",
                        FunctionUrlAuthType="NONE"
                    )
                    self.print_success("Public access permission added")
                except ClientError as e:
                    if e.response["Error"]["Code"] != "ResourceConflictException":
                        raise

                return function_url

            except ClientError as e:
                if e.response["Error"]["Code"] == "ResourceConflictException":
                    self.print_info("Function URL already exists")
                    response = self.lambda_client.get_function_url_config(
                        FunctionName=LAMBDA_FUNCTION_NAME
                    )
                    return response["FunctionUrl"]
                else:
                    raise

        except Exception as e:
            self.print_fail("Failed to create Function URL", e)
            return None

    # ========================================================================
    # Main Deployment Flow
    # ========================================================================

    def deploy(self) -> Dict:
        """Execute full deployment pipeline"""
        print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * 80}")
        print(f"🚀 AWS Lambda Deployment - Code Canvas Astro")
        print(f"   Database Persistence: S3 Bucket")
        print(f"   Region: {AWS_REGION}")
        print(f"   Account: {AWS_ACCOUNT}")
        print(f"   Image Tag: {IMAGE_TAG}")
        print(f"{'=' * 80}{Colors.ENDC}\n")

        deployment_result = {
            "success": False,
            "s3_bucket": None,
            "ecr_repository": None,
            "image_uri": None,
            "function_arn": None,
            "function_url": None,
            "failed_step": None,
            "error": None
        }

        total_steps = 6

        try:
            # Step 1: S3 Bucket
            self.print_step(1, total_steps, "S3 Bucket for Database Storage")
            if not self.create_s3_bucket():
                deployment_result["failed_step"] = "S3 Bucket"
                return deployment_result
            deployment_result["s3_bucket"] = S3_BUCKET_NAME

            # Step 2: ECR Repository
            self.print_step(2, total_steps, "ECR Repository Setup")
            if not self.create_ecr_repository():
                deployment_result["failed_step"] = "ECR Repository"
                return deployment_result
            deployment_result["ecr_repository"] = self.ecr_uri

            # Step 3: Docker Build and Push
            self.print_step(3, total_steps, "Docker Build & Push")
            if not self.build_and_push_docker_image():
                deployment_result["failed_step"] = "Docker Build"
                return deployment_result
            deployment_result["image_uri"] = self.image_uri

            # Step 4: IAM Role
            self.print_step(4, total_steps, "IAM Role Creation with S3 Permissions")
            role_arn = self.create_lambda_execution_role()
            if not role_arn:
                deployment_result["failed_step"] = "IAM Role"
                return deployment_result

            # Step 5: Lambda Function
            self.print_step(5, total_steps, "Lambda Function Deployment")
            function_arn = self.create_or_update_lambda_function(role_arn)
            if not function_arn:
                deployment_result["failed_step"] = "Lambda Function"
                return deployment_result
            deployment_result["function_arn"] = function_arn

            # Step 6: Function URL
            self.print_step(6, total_steps, "Function URL Creation")
            function_url = self.create_function_url()
            if not function_url:
                deployment_result["failed_step"] = "Function URL"
                return deployment_result
            deployment_result["function_url"] = function_url
            deployment_result["success"] = True

            # Print final summary
            self.print_deployment_summary(deployment_result)

            return deployment_result

        except Exception as e:
            self.print_fail(f"Unexpected deployment error", e)
            deployment_result["error"] = str(e)
            return deployment_result

    def print_deployment_summary(self, result: Dict):
        """Print deployment summary"""
        print(f"\n{Colors.OKGREEN}{Colors.BOLD}{'=' * 80}")
        print(f"✅ DEPLOYMENT SUCCESSFUL!")
        print(f"{'=' * 80}{Colors.ENDC}\n")

        print(f"{Colors.OKGREEN}💾 S3 Bucket:          {result['s3_bucket']}")
        print(f"📦 ECR Repository:     {result['ecr_repository']}")
        print(f"🐳 Docker Image:       {result['image_uri']}")
        print(f"⚡ Lambda Function:    {result['function_arn']}")
        print(f"🌐 Function URL:       {result['function_url']}")
        print(f"{'─' * 80}{Colors.ENDC}\n")

        print(f"{Colors.OKGREEN}✅ DATABASE PERSISTENCE (S3):")
        print(f"   • SQLite database stored in S3: s3://{S3_BUCKET_NAME}/{S3_DB_KEY}")
        print(f"   • Downloaded to Lambda /tmp on cold start")
        print(f"   • Uploaded back to S3 after write operations")
        print(f"   • Data persists across ALL Lambda invocations")
        print(f"   • Truly persistent storage{Colors.ENDC}\n")

        print(f"{Colors.OKCYAN}🚀 NEXT STEPS:")
        print(f"   1. Test your Lambda function:")
        print(f"      curl {result['function_url']}")
        print(f"")
        print(f"   2. Monitor logs in real-time:")
        print(f"      aws logs tail /aws/lambda/{LAMBDA_FUNCTION_NAME} --follow --region {AWS_REGION}")
        print(f"")
        print(f"   3. Check S3 database:")
        print(f"      aws s3 ls s3://{S3_BUCKET_NAME}/{S3_DB_KEY}")
        print(f"")
        print(f"   4. Access your app:")
        print(f"      {result['function_url']}{Colors.ENDC}\n")

        print(f"{Colors.WARNING}💰 COST ESTIMATE:")
        print(f"   • Lambda: ~$2-5/month (10K requests)")
        print(f"   • S3: ~$0.023/GB-month")
        print(f"   • ECR: ~$0.10/GB-month")
        print(f"   • Total: ~$2-6/month{Colors.ENDC}\n")


def main():
    """Main entry point"""
    deployer = LambdaDeployer()
    result = deployer.deploy()

    if result["success"]:
        print(f"\n{Colors.OKGREEN}✅ Deployment completed successfully!{Colors.ENDC}")
        print(f"{Colors.OKBLUE}🌐 Access your app at: {result['function_url']}{Colors.ENDC}\n")
        sys.exit(0)
    else:
        print(f"\n{Colors.FAIL}❌ Deployment failed at step: {result.get('failed_step', 'Unknown')}")
        if result.get('error'):
            print(f"   Error: {result['error']}")
        print(f"{Colors.ENDC}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
