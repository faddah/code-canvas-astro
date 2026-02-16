#!/usr/bin/env python3
"""
AWS App Runner Deployment Script for Code Canvas Astro
Handles: ECR Repository → Docker Build/Push → EFS File System → App Runner Service

Features:
- Creates ECR repository for container images
- Builds and pushes Docker image with specified tag
- Creates EFS file system for SQLite database persistence
- Deploys/updates App Runner service with EFS mount
- Returns deployment status and public URL

SECURITY: Uses AWS credential chain (no hardcoded credentials)
Configure via: aws configure or environment variables
"""

import subprocess
import sys
import time
import os
import json
from typing import Dict, Optional, Tuple

import boto3
from botocore.exceptions import ClientError, WaiterError

# ============================================================================
# CONFIGURATION
# ============================================================================
AWS_REGION = "us-west-2"
AWS_ACCOUNT = "415740581749"
ECR_REPO_NAME = "python-repl-container-lambda"
APP_RUNNER_SERVICE_NAME = "python-repl-app"
IMAGE_TAG = "v1.2"
DOCKER_CONTEXT = "/Users/faddah/Documents/code/code - projects/code-canvas-astro"
EFS_NAME = "code-canvas-astro-db"

# App Runner configuration
APP_RUNNER_CONFIG = {
    "port": "3000",
    "cpu": "1 vCPU",
    "memory": "2 GB",
    "healthcheck_path": "/",
    "healthcheck_protocol": "HTTP",
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


class AppRunnerDeployer:
    """AWS App Runner deployment orchestrator with EFS support"""

    def __init__(self):
        """Initialize AWS clients"""
        self.ecr_client = boto3.client("ecr", region_name=AWS_REGION)
        self.apprunner_client = boto3.client("apprunner", region_name=AWS_REGION)
        self.ec2_client = boto3.client("ec2", region_name=AWS_REGION)
        self.efs_client = boto3.client("efs", region_name=AWS_REGION)
        self.iam_client = boto3.client("iam", region_name=AWS_REGION)

        self.ecr_uri = None
        self.image_uri = None
        self.efs_id = None
        self.vpc_id = None
        self.subnet_ids = []
        self.security_group_id = None

    def print_header(self, message: str):
        """Print formatted header"""
        print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * 80}")
        print(f"{message}")
        print(f"{'=' * 80}{Colors.ENDC}")

    def print_success(self, message: str):
        """Print success message"""
        print(f"{Colors.OKGREEN}✅ {message}{Colors.ENDC}")

    def print_error(self, message: str):
        """Print error message"""
        print(f"{Colors.FAIL}❌ {message}{Colors.ENDC}")

    def print_info(self, message: str):
        """Print info message"""
        print(f"{Colors.OKCYAN}ℹ️  {message}{Colors.ENDC}")

    def print_progress(self, message: str):
        """Print progress message"""
        print(f"{Colors.OKBLUE}🔄 {message}{Colors.ENDC}")

    # ========================================================================
    # ECR Repository Management
    # ========================================================================

    def create_ecr_repository(self) -> str:
        """Create or get existing ECR repository"""
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
        return self.ecr_uri

    # ========================================================================
    # Docker Image Build and Push
    # ========================================================================

    def build_and_push_docker_image(self) -> str:
        """Build and push Docker image to ECR"""
        self.print_progress("Building and pushing Docker image...")

        try:
            # Login to ECR
            self.print_progress("Authenticating with ECR...")
            ecr_endpoint = f"{AWS_ACCOUNT}.dkr.ecr.{AWS_REGION}.amazonaws.com"
            login_cmd = (
                f"aws ecr get-login-password --region {AWS_REGION} | "
                f"docker login --username AWS --password-stdin {ecr_endpoint}"
            )
            subprocess.run(login_cmd, shell=True, check=True, capture_output=True)

            # Build Docker image
            self.print_progress(f"Building Docker image from {DOCKER_CONTEXT}...")
            build_cmd = [
                "docker",
                "build",
                "--platform",
                "linux/amd64",
                "-t",
                f"{ECR_REPO_NAME}:{IMAGE_TAG}",
                "-f",
                f"{DOCKER_CONTEXT}/Dockerfile",
                DOCKER_CONTEXT,
            ]
            result = subprocess.run(build_cmd, check=True, capture_output=True, text=True)

            # Tag for ECR
            self.print_progress(f"Tagging image: {self.image_uri}")
            tag_cmd = ["docker", "tag", f"{ECR_REPO_NAME}:{IMAGE_TAG}", self.image_uri]
            subprocess.run(tag_cmd, check=True, capture_output=True)

            # Push to ECR
            self.print_progress("Pushing to ECR...")
            push_cmd = ["docker", "push", self.image_uri]
            subprocess.run(push_cmd, check=True, capture_output=True)

            self.print_success(f"Docker image pushed: {self.image_uri}")
            return self.image_uri

        except subprocess.CalledProcessError as e:
            self.print_error(f"Docker operation failed: {e.stderr if e.stderr else str(e)}")
            raise

    # ========================================================================
    # VPC and Network Configuration
    # ========================================================================

    def get_default_vpc_and_subnets(self) -> Tuple[str, list]:
        """Get default VPC and subnets for EFS"""
        self.print_progress("Getting VPC and subnet information...")

        try:
            # Get default VPC
            vpcs = self.ec2_client.describe_vpcs(
                Filters=[{"Name": "isDefault", "Values": ["true"]}]
            )

            if not vpcs["Vpcs"]:
                raise Exception("No default VPC found. Please create a VPC first.")

            self.vpc_id = vpcs["Vpcs"][0]["VpcId"]

            # Get subnets in the VPC
            subnets = self.ec2_client.describe_subnets(
                Filters=[{"Name": "vpc-id", "Values": [self.vpc_id]}]
            )

            self.subnet_ids = [subnet["SubnetId"] for subnet in subnets["Subnets"]]

            self.print_success(f"Using VPC: {self.vpc_id} with {len(self.subnet_ids)} subnets")
            return self.vpc_id, self.subnet_ids

        except ClientError as e:
            self.print_error(f"Failed to get VPC info: {e}")
            raise

    def create_security_group(self) -> str:
        """Create security group for EFS"""
        self.print_progress("Creating security group for EFS...")

        sg_name = f"{EFS_NAME}-sg"

        try:
            # Check if security group already exists
            existing_sgs = self.ec2_client.describe_security_groups(
                Filters=[
                    {"Name": "group-name", "Values": [sg_name]},
                    {"Name": "vpc-id", "Values": [self.vpc_id]}
                ]
            )

            if existing_sgs["SecurityGroups"]:
                self.security_group_id = existing_sgs["SecurityGroups"][0]["GroupId"]
                self.print_info(f"Using existing security group: {self.security_group_id}")
                return self.security_group_id

            # Create new security group
            response = self.ec2_client.create_security_group(
                GroupName=sg_name,
                Description="Security group for Code Canvas Astro EFS",
                VpcId=self.vpc_id
            )

            self.security_group_id = response["GroupId"]

            # Add inbound rule for NFS (port 2049)
            self.ec2_client.authorize_security_group_ingress(
                GroupId=self.security_group_id,
                IpPermissions=[
                    {
                        "IpProtocol": "tcp",
                        "FromPort": 2049,
                        "ToPort": 2049,
                        "IpRanges": [{"CidrIp": "0.0.0.0/0"}]
                    }
                ]
            )

            self.print_success(f"Security group created: {self.security_group_id}")
            return self.security_group_id

        except ClientError as e:
            self.print_error(f"Failed to create security group: {e}")
            raise

    # ========================================================================
    # EFS File System Management
    # ========================================================================

    def create_efs_file_system(self) -> str:
        """Create EFS file system for database persistence"""
        self.print_progress("Setting up EFS file system for database persistence...")

        try:
            # Check if EFS already exists
            file_systems = self.efs_client.describe_file_systems()
            for fs in file_systems["FileSystems"]:
                if fs.get("Name") == EFS_NAME:
                    self.efs_id = fs["FileSystemId"]
                    self.print_info(f"Using existing EFS: {self.efs_id}")
                    return self.efs_id

            # Create EFS file system
            response = self.efs_client.create_file_system(
                CreationToken=f"{EFS_NAME}-{int(time.time())}",
                PerformanceMode="generalPurpose",
                ThroughputMode="bursting",
                Encrypted=True,
                Tags=[
                    {"Key": "Name", "Value": EFS_NAME},
                    {"Key": "Purpose", "Value": "SQLite Database Storage"}
                ]
            )

            self.efs_id = response["FileSystemId"]
            self.print_success(f"EFS file system created: {self.efs_id}")

            # Wait for EFS to be available
            self.print_progress("Waiting for EFS to become available...")
            waiter = self.efs_client.get_waiter("file_system_available")
            waiter.wait(FileSystemId=self.efs_id)

            # Create mount targets in each subnet
            self.print_progress("Creating EFS mount targets...")
            for subnet_id in self.subnet_ids:
                try:
                    self.efs_client.create_mount_target(
                        FileSystemId=self.efs_id,
                        SubnetId=subnet_id,
                        SecurityGroups=[self.security_group_id]
                    )
                except ClientError as e:
                    if e.response["Error"]["Code"] != "MountTargetConflict":
                        raise

            self.print_success("EFS mount targets created")
            return self.efs_id

        except ClientError as e:
            self.print_error(f"Failed to create EFS: {e}")
            raise

    # ========================================================================
    # App Runner Service Management
    # ========================================================================

    def create_access_role(self) -> str:
        """Create IAM role for App Runner to access ECR"""
        role_name = f"{APP_RUNNER_SERVICE_NAME}-access-role"
        self.print_progress(f"Setting up IAM access role: {role_name}")

        trust_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"Service": "build.apprunner.amazonaws.com"},
                    "Action": "sts:AssumeRole"
                }
            ]
        }

        try:
            response = self.iam_client.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=json.dumps(trust_policy),
                Description="App Runner access role for ECR"
            )
            role_arn = response["Role"]["Arn"]

            # Attach ECR read policy
            self.iam_client.attach_role_policy(
                RoleName=role_name,
                PolicyArn="arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
            )

            # Wait for role propagation
            time.sleep(10)

            self.print_success(f"IAM role created: {role_arn}")
            return role_arn

        except ClientError as e:
            if e.response["Error"]["Code"] == "EntityAlreadyExists":
                self.print_info("Role already exists, using existing one")
                response = self.iam_client.get_role(RoleName=role_name)
                return response["Role"]["Arn"]
            else:
                raise

    def create_instance_role(self) -> str:
        """Create IAM role for App Runner instance (for EFS access)"""
        role_name = f"{APP_RUNNER_SERVICE_NAME}-instance-role"
        self.print_progress(f"Setting up IAM instance role: {role_name}")

        trust_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"Service": "tasks.apprunner.amazonaws.com"},
                    "Action": "sts:AssumeRole"
                }
            ]
        }

        # Policy for EFS access
        efs_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "elasticfilesystem:ClientMount",
                        "elasticfilesystem:ClientWrite",
                        "elasticfilesystem:DescribeFileSystems"
                    ],
                    "Resource": f"arn:aws:elasticfilesystem:{AWS_REGION}:{AWS_ACCOUNT}:file-system/{self.efs_id}"
                }
            ]
        }

        try:
            response = self.iam_client.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=json.dumps(trust_policy),
                Description="App Runner instance role for EFS access"
            )
            role_arn = response["Role"]["Arn"]

            # Attach inline policy for EFS
            self.iam_client.put_role_policy(
                RoleName=role_name,
                PolicyName="EFSAccessPolicy",
                PolicyDocument=json.dumps(efs_policy)
            )

            # Wait for role propagation
            time.sleep(10)

            self.print_success(f"IAM instance role created: {role_arn}")
            return role_arn

        except ClientError as e:
            if e.response["Error"]["Code"] == "EntityAlreadyExists":
                self.print_info("Instance role already exists, using existing one")
                response = self.iam_client.get_role(RoleName=role_name)
                return response["Role"]["Arn"]
            else:
                raise

    def create_or_update_app_runner_service(
        self, access_role_arn: str, instance_role_arn: str
    ) -> Dict:
        """Create or update App Runner service"""
        self.print_progress(f"Deploying App Runner service: {APP_RUNNER_SERVICE_NAME}")

        service_config = {
            "ServiceName": APP_RUNNER_SERVICE_NAME,
            "SourceConfiguration": {
                "ImageRepository": {
                    "ImageIdentifier": self.image_uri,
                    "ImageRepositoryType": "ECR",
                    "ImageConfiguration": {
                        "Port": APP_RUNNER_CONFIG["port"],
                        "RuntimeEnvironmentVariables": {
                            "NODE_ENV": "production",
                            "DATABASE_URL": "file:/mnt/efs/taskManagement.db",
                            "PORT": APP_RUNNER_CONFIG["port"]
                        }
                    }
                },
                "AuthenticationConfiguration": {
                    "AccessRoleArn": access_role_arn
                },
                "AutoDeploymentsEnabled": False
            },
            "InstanceConfiguration": {
                "Cpu": APP_RUNNER_CONFIG["cpu"],
                "Memory": APP_RUNNER_CONFIG["memory"],
                "InstanceRoleArn": instance_role_arn
            },
            "HealthCheckConfiguration": {
                "Protocol": APP_RUNNER_CONFIG["healthcheck_protocol"],
                "Path": APP_RUNNER_CONFIG["healthcheck_path"],
                "Interval": 10,
                "Timeout": 5,
                "HealthyThreshold": 1,
                "UnhealthyThreshold": 5
            }
        }

        # NOTE: App Runner doesn't support EFS directly yet!
        # This is a limitation as of 2026. You would need to:
        # 1. Use RDS instead of SQLite
        # 2. Deploy to ECS/Fargate instead
        # 3. Store DB in the container (non-persistent)

        try:
            # Check if service exists
            try:
                existing_service = self.apprunner_client.describe_service(
                    ServiceArn=f"arn:aws:apprunner:{AWS_REGION}:{AWS_ACCOUNT}:service/{APP_RUNNER_SERVICE_NAME}"
                )
                service_arn = existing_service["Service"]["ServiceArn"]

                self.print_info("Service exists, updating...")

                # Update service
                response = self.apprunner_client.update_service(
                    ServiceArn=service_arn,
                    SourceConfiguration=service_config["SourceConfiguration"],
                    InstanceConfiguration=service_config["InstanceConfiguration"],
                    HealthCheckConfiguration=service_config["HealthCheckConfiguration"]
                )

            except ClientError as e:
                if e.response["Error"]["Code"] == "ResourceNotFoundException":
                    # Create new service
                    self.print_progress("Creating new App Runner service...")
                    response = self.apprunner_client.create_service(**service_config)
                else:
                    raise

            service_arn = response["Service"]["ServiceArn"]
            service_id = response["Service"]["ServiceId"]

            self.print_success(f"App Runner service initiated: {service_arn}")

            # Wait for service to be running
            self.print_progress("Waiting for service deployment (this may take 3-5 minutes)...")

            max_attempts = 60
            attempt = 0

            while attempt < max_attempts:
                service_info = self.apprunner_client.describe_service(ServiceArn=service_arn)
                status = service_info["Service"]["Status"]

                if status == "RUNNING":
                    self.print_success("Service is now RUNNING!")
                    return service_info["Service"]
                elif status in ["CREATE_FAILED", "UPDATE_FAILED", "DELETE_FAILED"]:
                    self.print_error(f"Service deployment failed with status: {status}")
                    raise Exception(f"Service deployment failed: {status}")

                print(f"  Status: {status} ... waiting", end="\r")
                time.sleep(10)
                attempt += 1

            raise Exception("Service deployment timeout")

        except ClientError as e:
            self.print_error(f"Failed to create/update App Runner service: {e}")
            raise

    # ========================================================================
    # Main Deployment Flow
    # ========================================================================

    def deploy(self) -> Dict:
        """Execute full deployment pipeline"""
        self.print_header(
            f"🚀 AWS App Runner Deployment - Code Canvas Astro\n"
            f"   Region: {AWS_REGION}\n"
            f"   Account: {AWS_ACCOUNT}\n"
            f"   Image Tag: {IMAGE_TAG}"
        )

        deployment_result = {
            "success": False,
            "ecr_repository": None,
            "image_uri": None,
            "efs_id": None,
            "service_url": None,
            "errors": []
        }

        try:
            # Step 1: ECR Repository
            self.print_header("Step 1/7: ECR Repository")
            ecr_uri = self.create_ecr_repository()
            deployment_result["ecr_repository"] = ecr_uri

            # Step 2: Build and Push Docker Image
            self.print_header("Step 2/7: Docker Build & Push")
            image_uri = self.build_and_push_docker_image()
            deployment_result["image_uri"] = image_uri

            # Step 3: VPC and Network Setup
            self.print_header("Step 3/7: VPC and Network Configuration")
            vpc_id, subnet_ids = self.get_default_vpc_and_subnets()

            # Step 4: Security Group
            self.print_header("Step 4/7: Security Group")
            sg_id = self.create_security_group()

            # Step 5: EFS File System (for future use - not supported by App Runner yet)
            self.print_header("Step 5/7: EFS File System")
            self.print_info(
                "Note: App Runner doesn't support EFS mounts yet. "
                "Database will be stored in container (non-persistent)."
            )
            # efs_id = self.create_efs_file_system()
            # deployment_result["efs_id"] = efs_id

            # Step 6: IAM Roles
            self.print_header("Step 6/7: IAM Roles")
            access_role_arn = self.create_access_role()
            instance_role_arn = self.create_instance_role()

            # Step 7: App Runner Service
            self.print_header("Step 7/7: App Runner Service Deployment")
            service_info = self.create_or_update_app_runner_service(
                access_role_arn, instance_role_arn
            )

            service_url = f"https://{service_info['ServiceUrl']}"
            deployment_result["service_url"] = service_url
            deployment_result["success"] = True

            # Print final summary
            self.print_deployment_summary(deployment_result)

            return deployment_result

        except Exception as e:
            self.print_error(f"Deployment failed: {str(e)}")
            deployment_result["errors"].append(str(e))
            return deployment_result

    def print_deployment_summary(self, result: Dict):
        """Print deployment summary"""
        self.print_header("✅ DEPLOYMENT SUCCESSFUL!")

        print(f"\n{Colors.OKGREEN}{'─' * 80}")
        print(f"📦 ECR Repository:     {result['ecr_repository']}")
        print(f"🐳 Docker Image:       {result['image_uri']}")
        if result.get('efs_id'):
            print(f"💾 EFS File System:    {result['efs_id']}")
        print(f"🌐 Service URL:        {result['service_url']}")
        print(f"{'─' * 80}{Colors.ENDC}\n")

        print(f"{Colors.WARNING}⚠️  IMPORTANT NOTES:")
        print(f"   • Database is stored in container (non-persistent)")
        print(f"   • App Runner doesn't support EFS yet")
        print(f"   • For persistent data, consider migrating to RDS or ECS/Fargate")
        print(f"   • Service URL: {result['service_url']}{Colors.ENDC}\n")


def main():
    """Main entry point"""
    deployer = AppRunnerDeployer()
    result = deployer.deploy()

    if result["success"]:
        print(f"\n{Colors.OKGREEN}✅ Deployment completed successfully!{Colors.ENDC}")
        print(f"{Colors.OKBLUE}🌐 Access your app at: {result['service_url']}{Colors.ENDC}\n")
        sys.exit(0)
    else:
        print(f"\n{Colors.FAIL}❌ Deployment failed!{Colors.ENDC}")
        for error in result["errors"]:
            print(f"   • {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()
