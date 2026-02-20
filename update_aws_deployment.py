#!/usr/bin/env python3
"""
AWS Update Deployment Script for Code Canvas Astro
====================================================
Triggered after code is pushed to GitHub. Performs a full rebuild and
re-deployment of all Docker containers and AWS services.

Pipeline:
  1.  Read & validate version from package.json
  2.  Build Docker app container  (Dockerfile        → code-canvas-astro-app)
  3.  Build Docker db-init container (Dockerfile.db  → code-canvas-astro-db-init)
  4.  Log in to Docker Hub & push both containers  (tagged v[VERSION])
  5.  Authenticate with AWS ECR (boto3 token → docker login)
  6.  Build Lambda Docker image   (Dockerfile.lambda → ECR compatible)
  7.  Push Lambda image to AWS ECR (python-repl-container-lambda:v[VERSION])
  8.  Update AWS Lambda function  (code-canvas-astro-lambda) with new ECR image
  9.  Verify AWS API Gateway      (pyrepl-api / pvh7sgwr49) is operational
  10. Invalidate AWS CloudFront   (E8UQ2BAGKYYM0) cache & wait for completion
  11. Verify AWS Route 53         (pyrepl.dev / Z06161484WRKVMIQUBIG) DNS records
  12. Final health check          (https://pyrepl.dev)

Usage:
    python3 update_aws_deployment.py

Requirements:
    pip install boto3 botocore

SECURITY: Uses AWS credential chain — no hardcoded credentials.
Configure via:  aws configure  OR  AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars.
"""

import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from typing import Dict, Optional, Tuple

import boto3
from botocore.exceptions import ClientError

# ============================================================================
# CONFIGURATION  —  Edit the values below to match your environment
# ============================================================================

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
PACKAGE_JSON_PATH = os.path.join(PROJECT_ROOT, "package.json")

# ── Docker Hub ───────────────────────────────────────────────────────────────
# Set your Docker Hub username here.  The images will be pushed as:
#   {DOCKERHUB_USERNAME}/code-canvas-astro-app:v{VERSION}
#   {DOCKERHUB_USERNAME}/code-canvas-astro-db-init:v{VERSION}
DOCKERHUB_USERNAME = "faddah"   # <── UPDATE THIS

DOCKER_APP_IMAGE     = "code-canvas-astro-app"
DOCKER_DB_INIT_IMAGE = "code-canvas-astro-db-init"

# ── AWS ───────────────────────────────────────────────────────────────────────
AWS_REGION  = "us-west-2"
AWS_ACCOUNT = "415740581749"

# ECR
ECR_REPO_NAME = "python-repl-container-lambda"
ECR_REPO_URI  = f"{AWS_ACCOUNT}.dkr.ecr.{AWS_REGION}.amazonaws.com"
ECR_FULL_URI  = f"{ECR_REPO_URI}/{ECR_REPO_NAME}"

# Lambda
LAMBDA_FUNCTION_NAME = "code-canvas-astro-lambda"
LAMBDA_FUNCTION_ARN  = (
    f"arn:aws:lambda:{AWS_REGION}:{AWS_ACCOUNT}:function:{LAMBDA_FUNCTION_NAME}"
)
LAMBDA_FUNCTION_URL = (
    "https://jb6uzlmmok5wxyr2nzdci3wdfi0rcush.lambda-url.us-west-2.on.aws/"
)
LAMBDA_CONFIG = {
    "memory":            2048,   # MB
    "timeout":           900,    # seconds (15 min max)
    "ephemeral_storage": 1024,   # MB for /tmp
}

# S3 (Lambda database persistence)
S3_BUCKET_NAME = "code-canvas-astro-db"
S3_DB_KEY      = "database/taskManagement.db"

# API Gateway
API_GATEWAY_ID   = "pvh7sgwr49"
API_GATEWAY_NAME = "pyrepl-api"

# CloudFront
CLOUDFRONT_DISTRIBUTION_ID  = "E8UQ2BAGKYYM0"
CLOUDFRONT_DISTRIBUTION_ARN = (
    f"arn:aws:cloudfront::{AWS_ACCOUNT}:distribution/{CLOUDFRONT_DISTRIBUTION_ID}"
)
CLOUDFRONT_DOMAIN = "d367a5xu7jwhol.cloudfront.net"

# Route 53
ROUTE53_DOMAIN         = "pyrepl.dev"
ROUTE53_HOSTED_ZONE_ID = "Z06161484WRKVMIQUBIG"


# ============================================================================
# ANSI COLORS
# ============================================================================

class C:
    HEADER  = "\033[95m"
    BLUE    = "\033[94m"
    CYAN    = "\033[96m"
    GREEN   = "\033[92m"
    WARNING = "\033[93m"
    FAIL    = "\033[91m"
    ENDC    = "\033[0m"
    BOLD    = "\033[1m"


# ============================================================================
# STAGE REPORTER
# ============================================================================

class StageReporter:
    """Prints consistent STAGE N: description - SUCCESS/FAIL lines."""

    def __init__(self, total: int):
        self.total   = total
        self.current = 0

    def start(self, description: str) -> None:
        self.current += 1
        print(
            f"\n{C.HEADER}{C.BOLD}"
            f"{'─' * 80}\n"
            f"STAGE {self.current}/{self.total}: {description}\n"
            f"{'─' * 80}{C.ENDC}"
        )

    def success(self, detail: str = "") -> None:
        label = f"STAGE {self.current}/{self.total}"
        msg   = f" — {detail}" if detail else ""
        print(f"{C.GREEN}{C.BOLD}✅ {label}: SUCCESS{msg}{C.ENDC}")

    def fail(
        self,
        description: str,
        error: Optional[Exception] = None,
        fix_hint: str = "",
    ) -> None:
        label = f"STAGE {self.current}/{self.total}"
        print(f"{C.FAIL}{C.BOLD}❌ {label}: FAIL — {description}{C.ENDC}")
        if error:
            print(f"{C.FAIL}   Error type   : {type(error).__name__}{C.ENDC}")
            print(f"{C.FAIL}   Error details: {error}{C.ENDC}")
            if hasattr(error, "response"):
                code = error.response.get("Error", {}).get("Code", "n/a")
                msg  = error.response.get("Error", {}).get("Message", "n/a")
                print(f"{C.FAIL}   AWS Error Code   : {code}{C.ENDC}")
                print(f"{C.FAIL}   AWS Error Message: {msg}{C.ENDC}")
        if fix_hint:
            print(f"{C.WARNING}   Fix: {fix_hint}{C.ENDC}")

    @staticmethod
    def info(msg: str) -> None:
        print(f"{C.CYAN}   ℹ  {msg}{C.ENDC}")

    @staticmethod
    def progress(msg: str) -> None:
        print(f"{C.BLUE}   ⟳  {msg}{C.ENDC}")


# ============================================================================
# HELPER — run subprocess and capture output
# ============================================================================

def run(
    cmd: list,
    description: str = "",
    shell: bool = False,
    env: Optional[dict] = None,
) -> Tuple[bool, str, str]:
    """
    Run a subprocess command.

    Returns:
        (success: bool, stdout: str, stderr: str)
    """
    if description:
        print(f"{C.BLUE}   ⟳  {description}{C.ENDC}")
    try:
        result = subprocess.run(
            cmd,
            shell=shell,
            check=True,
            capture_output=True,
            text=True,
            env=env or os.environ.copy(),
        )
        return True, result.stdout.strip(), result.stderr.strip()
    except subprocess.CalledProcessError as exc:
        stdout = exc.stdout.strip() if exc.stdout else ""
        stderr = exc.stderr.strip() if exc.stderr else str(exc)
        return False, stdout, stderr


# ============================================================================
# UPDATE DEPLOYER
# ============================================================================

class UpdateDeployer:
    """Orchestrates the full update-deployment pipeline."""

    def __init__(self):
        self.version     : str = ""
        self.image_tag   : str = ""
        self.ecr_image_uri: str = ""

        # Boto3 clients
        self.ecr_client    = boto3.client("ecr",          region_name=AWS_REGION)
        self.lambda_client = boto3.client("lambda",       region_name=AWS_REGION)
        self.apigw_client  = boto3.client("apigateway",   region_name=AWS_REGION)
        self.cf_client     = boto3.client("cloudfront")
        self.r53_client    = boto3.client("route53")
        self.sts_client    = boto3.client("sts")

        self.reporter = StageReporter(total=12)

    # ────────────────────────────────────────────────────────────────────────
    # PRE-FLIGHT
    # ────────────────────────────────────────────────────────────────────────

    def preflight_check(self) -> bool:
        """Verify AWS credentials and basic config before starting."""
        print(f"\n{C.CYAN}{C.BOLD}{'=' * 80}")
        print("   Code Canvas Astro — AWS Update Deployment")
        print(f"{'=' * 80}{C.ENDC}\n")
        print(f"{C.CYAN}Pre-flight checks:{C.ENDC}")

        # AWS credentials
        try:
            identity = self.sts_client.get_caller_identity()
            print(
                f"   {C.GREEN}✓{C.ENDC} AWS credentials valid"
                f"  (account: {identity['Account']}, "
                f"user: {identity.get('Arn', 'unknown')})"
            )
        except ClientError as exc:
            print(
                f"   {C.FAIL}✗ AWS credentials not configured or invalid: {exc}{C.ENDC}"
            )
            print(
                f"   {C.WARNING}Fix: run 'aws configure' or set "
                "AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars.{C.ENDC}"
            )
            return False

        # Docker available?
        ok, _, err = run(["docker", "info"], "Checking Docker daemon")
        if not ok:
            print(f"   {C.FAIL}✗ Docker daemon not running: {err}{C.ENDC}")
            print(f"   {C.WARNING}Fix: start Docker Desktop or the Docker daemon.{C.ENDC}")
            return False
        print(f"   {C.GREEN}✓{C.ENDC} Docker daemon is running")

        # Docker Hub username configured?
        if DOCKERHUB_USERNAME == "your-dockerhub-username":
            print(
                f"   {C.FAIL}✗ DOCKERHUB_USERNAME is not set in this script.{C.ENDC}"
            )
            print(
                f"   {C.WARNING}Fix: open update-aws-deployment.py and set "
                "DOCKERHUB_USERNAME to your Docker Hub account name.{C.ENDC}"
            )
            return False
        print(f"   {C.GREEN}✓{C.ENDC} Docker Hub username: {DOCKERHUB_USERNAME}")

        # package.json exists?
        if not os.path.isfile(PACKAGE_JSON_PATH):
            print(f"   {C.FAIL}✗ package.json not found at {PACKAGE_JSON_PATH}{C.ENDC}")
            return False
        print(f"   {C.GREEN}✓{C.ENDC} package.json found")

        print()
        return True

    # ────────────────────────────────────────────────────────────────────────
    # STAGE 1 — Read version from package.json
    # ────────────────────────────────────────────────────────────────────────

    def stage_01_read_version(self) -> bool:
        self.reporter.start("Read & validate version from package.json")
        try:
            with open(PACKAGE_JSON_PATH, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            version = data.get("version", "").strip()
            if not version:
                self.reporter.fail(
                    "No 'version' field found in package.json",
                    fix_hint="Add a 'version' field to package.json, e.g. \"version\": \"1.2.0\"",
                )
                return False

            self.version   = version
            self.image_tag = f"v{version}"
            self.reporter.info(f"App name : {data.get('name', '(unknown)')}")
            self.reporter.info(f"Version  : {self.version}")
            self.reporter.info(f"Image tag: {self.image_tag}")
            self.reporter.success(f"version={self.version}, tag={self.image_tag}")
            return True

        except json.JSONDecodeError as exc:
            self.reporter.fail(
                "package.json is not valid JSON",
                error=exc,
                fix_hint="Check package.json for syntax errors.",
            )
            return False
        except OSError as exc:
            self.reporter.fail("Cannot read package.json", error=exc)
            return False

    # ────────────────────────────────────────────────────────────────────────
    # STAGE 2 — Build app Docker container (Dockerfile)
    # ────────────────────────────────────────────────────────────────────────

    def stage_02_build_app_container(self) -> bool:
        self.reporter.start(
            f"Build Docker app container: {DOCKER_APP_IMAGE}:{self.image_tag}"
        )
        local_tag = f"{DOCKER_APP_IMAGE}:{self.image_tag}"
        cmd = [
            "docker", "buildx", "build",
            "--platform", "linux/amd64",
            "--provenance=false",
            "--sbom=false",
            "--load",
            "-t", local_tag,
            "-f", os.path.join(PROJECT_ROOT, "Dockerfile"),
            PROJECT_ROOT,
        ]
        self.reporter.progress(f"docker buildx build … -t {local_tag} -f Dockerfile")
        self.reporter.info("This may take several minutes on first build…")

        ok, stdout, stderr = run(cmd)
        if not ok:
            self.reporter.fail(
                f"docker build failed for {DOCKER_APP_IMAGE}",
                fix_hint=(
                    f"Review Dockerfile errors below:\n{stderr}"
                ),
            )
            if stderr:
                print(f"{C.FAIL}{stderr}{C.ENDC}")
            return False

        self.reporter.success(f"{DOCKER_APP_IMAGE}:{self.image_tag} built")
        return True

    # ────────────────────────────────────────────────────────────────────────
    # STAGE 3 — Build db-init Docker container (Dockerfile.db)
    # ────────────────────────────────────────────────────────────────────────

    def stage_03_build_db_init_container(self) -> bool:
        self.reporter.start(
            f"Build Docker db-init container: {DOCKER_DB_INIT_IMAGE}:{self.image_tag}"
        )
        local_tag = f"{DOCKER_DB_INIT_IMAGE}:{self.image_tag}"
        cmd = [
            "docker", "buildx", "build",
            "--platform", "linux/amd64",
            "--provenance=false",
            "--sbom=false",
            "--load",
            "-t", local_tag,
            "-f", os.path.join(PROJECT_ROOT, "Dockerfile.db"),
            PROJECT_ROOT,
        ]
        self.reporter.progress(f"docker buildx build … -t {local_tag} -f Dockerfile.db")

        ok, stdout, stderr = run(cmd)
        if not ok:
            self.reporter.fail(
                f"docker build failed for {DOCKER_DB_INIT_IMAGE}",
                fix_hint=f"Review Dockerfile.db errors:\n{stderr}",
            )
            if stderr:
                print(f"{C.FAIL}{stderr}{C.ENDC}")
            return False

        self.reporter.success(f"{DOCKER_DB_INIT_IMAGE}:{self.image_tag} built")
        return True

    # ────────────────────────────────────────────────────────────────────────
    # STAGE 4 — Log in to Docker Hub & push both containers
    # ────────────────────────────────────────────────────────────────────────

    def stage_04_push_to_dockerhub(self) -> bool:
        self.reporter.start(
            f"Push Docker containers to Docker Hub as "
            f"{DOCKERHUB_USERNAME}/{DOCKER_APP_IMAGE}:{self.image_tag} "
            f"and {DOCKERHUB_USERNAME}/{DOCKER_DB_INIT_IMAGE}:{self.image_tag}"
        )

        # Log in to Docker Hub
        self.reporter.progress("Authenticating with Docker Hub (docker login)…")
        login_ok, _, login_err = run(
            ["docker", "login", "--username", DOCKERHUB_USERNAME],
            description="docker login (interactive — enter password/token when prompted)",
        )
        # docker login requires a password; if it fails due to missing stdin in
        # a non-interactive shell, users should log in beforehand or set
        # DOCKER_PASSWORD and use --password-stdin:
        #   echo "$DOCKER_PASSWORD" | docker login --username $USER --password-stdin
        # We attempt it; if already logged in, the cached credentials are reused.
        # If it fails, we warn but continue (the push will fail and report clearly).

        images_to_push = [
            (
                f"{DOCKER_APP_IMAGE}:{self.image_tag}",
                f"{DOCKERHUB_USERNAME}/{DOCKER_APP_IMAGE}:{self.image_tag}",
                f"{DOCKERHUB_USERNAME}/{DOCKER_APP_IMAGE}:latest",
            ),
            (
                f"{DOCKER_DB_INIT_IMAGE}:{self.image_tag}",
                f"{DOCKERHUB_USERNAME}/{DOCKER_DB_INIT_IMAGE}:{self.image_tag}",
                f"{DOCKERHUB_USERNAME}/{DOCKER_DB_INIT_IMAGE}:latest",
            ),
        ]

        for local_tag, hub_tag, hub_latest_tag in images_to_push:
            # Tag versioned
            self.reporter.progress(f"Tagging {local_tag} → {hub_tag}")
            ok, _, err = run(["docker", "tag", local_tag, hub_tag])
            if not ok:
                self.reporter.fail(
                    f"docker tag failed: {local_tag} → {hub_tag}",
                    fix_hint=f"Error: {err}",
                )
                return False

            # Tag :latest
            self.reporter.progress(f"Tagging {local_tag} → {hub_latest_tag}")
            ok, _, err = run(["docker", "tag", local_tag, hub_latest_tag])
            if not ok:
                self.reporter.fail(
                    f"docker tag (latest) failed: {local_tag} → {hub_latest_tag}",
                    fix_hint=f"Error: {err}",
                )
                return False

            # Push versioned
            self.reporter.progress(f"Pushing {hub_tag} to Docker Hub…")
            ok, _, err = run(["docker", "push", hub_tag])
            if not ok:
                self.reporter.fail(
                    f"docker push failed for {hub_tag}",
                    fix_hint=(
                        "Ensure you are logged in to Docker Hub: "
                        f"'docker login --username {DOCKERHUB_USERNAME}'. "
                        f"Error: {err}"
                    ),
                )
                return False

            # Push :latest
            self.reporter.progress(f"Pushing {hub_latest_tag} to Docker Hub…")
            ok, _, err = run(["docker", "push", hub_latest_tag])
            if not ok:
                self.reporter.fail(
                    f"docker push (latest) failed for {hub_latest_tag}",
                    fix_hint=f"Error: {err}",
                )
                return False

            self.reporter.info(f"Pushed {hub_tag} ✓")
            self.reporter.info(f"Pushed {hub_latest_tag} ✓")

        self.reporter.success(
            f"{DOCKERHUB_USERNAME}/{DOCKER_APP_IMAGE}:{self.image_tag} and "
            f"{DOCKERHUB_USERNAME}/{DOCKER_DB_INIT_IMAGE}:{self.image_tag} "
            "pushed to Docker Hub"
        )
        return True

    # ────────────────────────────────────────────────────────────────────────
    # STAGE 5 — Authenticate with AWS ECR
    # ────────────────────────────────────────────────────────────────────────

    def stage_05_ecr_auth(self) -> bool:
        self.reporter.start(
            f"Authenticate with AWS ECR ({ECR_REPO_URI})"
        )
        try:
            self.reporter.progress("Requesting ECR auth token via boto3…")
            response     = self.ecr_client.get_authorization_token()
            auth_data    = response["authorizationData"][0]
            token        = base64.b64decode(auth_data["authorizationToken"]).decode()
            _user, password = token.split(":", 1)
            ecr_endpoint = auth_data["proxyEndpoint"]

            self.reporter.progress(f"Running docker login for {ecr_endpoint}…")
            login_cmd = [
                "docker", "login",
                "--username", "AWS",
                "--password-stdin",
                ecr_endpoint,
            ]
            proc = subprocess.run(
                login_cmd,
                input=password,
                capture_output=True,
                text=True,
                check=True,
            )
            self.reporter.success(f"Authenticated with AWS ECR at {ecr_endpoint}")
            return True

        except ClientError as exc:
            self.reporter.fail(
                "Failed to retrieve ECR auth token",
                error=exc,
                fix_hint=(
                    "Ensure your AWS credentials have ecr:GetAuthorizationToken permission."
                ),
            )
            return False
        except subprocess.CalledProcessError as exc:
            stderr = exc.stderr.strip() if exc.stderr else str(exc)
            self.reporter.fail(
                "docker login to ECR failed",
                fix_hint=f"docker login error: {stderr}",
            )
            return False

    # ────────────────────────────────────────────────────────────────────────
    # STAGE 6 — Build Lambda Docker image & push to AWS ECR
    # ────────────────────────────────────────────────────────────────────────

    def stage_06_build_and_push_ecr(self) -> bool:
        local_tag  = f"{ECR_REPO_NAME}:{self.image_tag}"
        ecr_tag    = f"{ECR_FULL_URI}:{self.image_tag}"
        ecr_latest = f"{ECR_FULL_URI}:latest"

        self.ecr_image_uri = ecr_tag

        self.reporter.start(
            f"Build Lambda Docker image & push to AWS ECR "
            f"({ECR_REPO_NAME}:{self.image_tag})"
        )

        # Build with Lambda-compatible flags (no provenance/sbom manifests)
        self.reporter.progress(
            f"Building Lambda image from Dockerfile.lambda → {local_tag}"
        )
        self.reporter.info(
            "Using --provenance=false --sbom=false for Lambda manifest compatibility."
        )
        build_cmd = [
            "docker", "buildx", "build",
            "--platform", "linux/amd64",
            "--provenance=false",
            "--sbom=false",
            "--load",
            "-t", local_tag,
            "-f", os.path.join(PROJECT_ROOT, "Dockerfile.lambda"),
            PROJECT_ROOT,
        ]
        ok, _, err = run(build_cmd)
        if not ok:
            self.reporter.fail(
                "docker build (Dockerfile.lambda) failed",
                fix_hint=f"Review Dockerfile.lambda errors:\n{err}",
            )
            if err:
                print(f"{C.FAIL}{err}{C.ENDC}")
            return False
        self.reporter.info(f"Lambda image built: {local_tag}")

        # Tag for ECR (versioned)
        self.reporter.progress(f"Tagging {local_tag} → {ecr_tag}")
        ok, _, err = run(["docker", "tag", local_tag, ecr_tag])
        if not ok:
            self.reporter.fail(
                f"docker tag failed: {local_tag} → {ecr_tag}",
                fix_hint=f"Error: {err}",
            )
            return False

        # Tag for ECR (latest)
        self.reporter.progress(f"Tagging {local_tag} → {ecr_latest}")
        ok, _, err = run(["docker", "tag", local_tag, ecr_latest])
        if not ok:
            self.reporter.fail(
                f"docker tag (latest) failed: {local_tag} → {ecr_latest}",
                fix_hint=f"Error: {err}",
            )
            return False

        # Push versioned tag to ECR
        self.reporter.progress(f"Pushing {ecr_tag} to AWS ECR…")
        ok, _, err = run(["docker", "push", ecr_tag])
        if not ok:
            self.reporter.fail(
                f"docker push failed for {ecr_tag}",
                fix_hint=(
                    f"Ensure ECR auth succeeded (Stage 5) and the repository "
                    f"'{ECR_REPO_NAME}' exists in {AWS_REGION}. Error: {err}"
                ),
            )
            return False
        self.reporter.info(f"Pushed {ecr_tag} ✓")

        # Push :latest tag to ECR
        self.reporter.progress(f"Pushing {ecr_latest} to AWS ECR…")
        ok, _, err = run(["docker", "push", ecr_latest])
        if not ok:
            self.reporter.fail(
                f"docker push (latest) failed for {ecr_latest}",
                fix_hint=f"Error: {err}",
            )
            return False
        self.reporter.info(f"Pushed {ecr_latest} ✓")

        self.reporter.success(
            f"Docker container pushed to AWS ECR repository "
            f"`{ECR_REPO_NAME}` with tag `{self.image_tag}`"
        )
        return True

    # ────────────────────────────────────────────────────────────────────────
    # STAGE 7 — Update AWS Lambda function with new ECR image
    # ────────────────────────────────────────────────────────────────────────

    def stage_07_update_lambda(self) -> bool:
        self.reporter.start(
            f"Update AWS Lambda function `{LAMBDA_FUNCTION_NAME}` "
            f"→ new ECR image {self.ecr_image_uri}"
        )
        try:
            # Update function code
            self.reporter.progress("Calling lambda:UpdateFunctionCode…")
            self.lambda_client.update_function_code(
                FunctionName=LAMBDA_FUNCTION_NAME,
                ImageUri=self.ecr_image_uri,
            )
            self.reporter.info("Lambda code update initiated, waiting for completion…")

            # Wait until the function is no longer updating
            waiter = self.lambda_client.get_waiter("function_updated")
            waiter.wait(
                FunctionName=LAMBDA_FUNCTION_NAME,
                WaiterConfig={"Delay": 5, "MaxAttempts": 60},   # wait up to 5 min
            )
            self.reporter.info("Lambda code update complete.")

            # Update function configuration (memory, timeout, env vars)
            self.reporter.progress("Calling lambda:UpdateFunctionConfiguration…")
            self.lambda_client.update_function_configuration(
                FunctionName=LAMBDA_FUNCTION_NAME,
                Timeout=LAMBDA_CONFIG["timeout"],
                MemorySize=LAMBDA_CONFIG["memory"],
                EphemeralStorage={"Size": LAMBDA_CONFIG["ephemeral_storage"]},
                Environment={
                    "Variables": {
                        "NODE_ENV":       "production",
                        "S3_BUCKET_NAME": S3_BUCKET_NAME,
                        "S3_DB_KEY":      S3_DB_KEY,
                        "PORT":           "8080",
                        "DATABASE_URL":   "file:/tmp/taskManagement.db",
                    }
                },
            )
            # Wait again after configuration update
            waiter.wait(
                FunctionName=LAMBDA_FUNCTION_NAME,
                WaiterConfig={"Delay": 5, "MaxAttempts": 60},
            )
            self.reporter.info("Lambda configuration update complete.")

            # Confirm active image
            fn_info = self.lambda_client.get_function(
                FunctionName=LAMBDA_FUNCTION_NAME
            )
            active_uri = (
                fn_info.get("Code", {}).get("ImageUri", "")
                or fn_info.get("Configuration", {}).get("Code", {}).get("ImageUri", "")
            )
            self.reporter.info(f"Active image URI: {active_uri or self.ecr_image_uri}")

            self.reporter.success(
                f"`{LAMBDA_FUNCTION_NAME}` updated to {self.ecr_image_uri}"
            )
            return True

        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code == "ResourceNotFoundException":
                self.reporter.fail(
                    f"Lambda function `{LAMBDA_FUNCTION_NAME}` not found in {AWS_REGION}.",
                    error=exc,
                    fix_hint=(
                        f"Verify the function exists: aws lambda get-function "
                        f"--function-name {LAMBDA_FUNCTION_NAME} --region {AWS_REGION}"
                    ),
                )
            else:
                self.reporter.fail(
                    "Lambda update failed with an unexpected AWS error.",
                    error=exc,
                    fix_hint="Check IAM permissions: lambda:UpdateFunctionCode, "
                             "lambda:UpdateFunctionConfiguration.",
                )
            return False
        except Exception as exc:                               # noqa: BLE001
            self.reporter.fail("Unexpected error during Lambda update.", error=exc)
            return False

    # ────────────────────────────────────────────────────────────────────────
    # STAGE 8 — Verify AWS API Gateway is operational
    # ────────────────────────────────────────────────────────────────────────

    def stage_08_verify_api_gateway(self) -> bool:
        self.reporter.start(
            f"Verify AWS API Gateway `{API_GATEWAY_NAME}` (ID: {API_GATEWAY_ID}) "
            "is operational"
        )
        try:
            self.reporter.progress(
                f"Calling apigateway:GetRestApi for ID={API_GATEWAY_ID}…"
            )
            response = self.apigw_client.get_rest_api(restApiId=API_GATEWAY_ID)

            api_name = response.get("name", "(unknown)")
            api_id   = response.get("id", API_GATEWAY_ID)
            created  = response.get("createdDate", "")

            self.reporter.info(f"API Name   : {api_name}")
            self.reporter.info(f"API ID     : {api_id}")
            self.reporter.info(f"Created At : {created}")

            # Verify stages exist
            stages = self.apigw_client.get_stages(restApiId=API_GATEWAY_ID)
            stage_names = [s["stageName"] for s in stages.get("item", [])]
            self.reporter.info(f"Stages     : {stage_names if stage_names else '(none)'}")

            self.reporter.success(
                f"API Gateway `{API_GATEWAY_NAME}` is present and accessible"
            )
            return True

        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code == "NotFoundException":
                self.reporter.fail(
                    f"API Gateway ID `{API_GATEWAY_ID}` not found.",
                    error=exc,
                    fix_hint=(
                        f"Verify in AWS Console → API Gateway → APIs. "
                        f"Expected ID: {API_GATEWAY_ID}"
                    ),
                )
            else:
                self.reporter.fail(
                    "Unexpected error calling API Gateway.",
                    error=exc,
                    fix_hint="Ensure IAM permissions include apigateway:GET.",
                )
            return False
        except Exception as exc:                               # noqa: BLE001
            self.reporter.fail("Unexpected error verifying API Gateway.", error=exc)
            return False

    # ────────────────────────────────────────────────────────────────────────
    # STAGE 9 — Invalidate AWS CloudFront distribution cache
    # ────────────────────────────────────────────────────────────────────────

    def stage_09_invalidate_cloudfront(self) -> bool:
        self.reporter.start(
            f"Invalidate AWS CloudFront Distribution `{CLOUDFRONT_DISTRIBUTION_ID}` cache"
        )
        caller_ref = f"update-deploy-{self.image_tag}-{int(time.time())}"
        try:
            self.reporter.progress(
                f"Creating CloudFront invalidation for distribution "
                f"{CLOUDFRONT_DISTRIBUTION_ID} (paths: /*)…"
            )
            resp = self.cf_client.create_invalidation(
                DistributionId=CLOUDFRONT_DISTRIBUTION_ID,
                InvalidationBatch={
                    "Paths": {"Quantity": 1, "Items": ["/*"]},
                    "CallerReference": caller_ref,
                },
            )
            invalidation_id     = resp["Invalidation"]["Id"]
            invalidation_status = resp["Invalidation"]["Status"]

            self.reporter.info(f"Invalidation ID    : {invalidation_id}")
            self.reporter.info(f"Invalidation Status: {invalidation_status}")

            # Wait for the invalidation to complete (up to ~10 min)
            self.reporter.progress(
                "Waiting for CloudFront invalidation to complete "
                "(this can take 1–5 minutes)…"
            )
            waiter = self.cf_client.get_waiter("invalidation_completed")
            waiter.wait(
                DistributionId=CLOUDFRONT_DISTRIBUTION_ID,
                Id=invalidation_id,
                WaiterConfig={"Delay": 20, "MaxAttempts": 30},  # up to 10 min
            )

            self.reporter.success(
                f"CloudFront invalidation `{invalidation_id}` completed — "
                f"Distribution {CLOUDFRONT_DISTRIBUTION_ID} cache cleared"
            )
            return True

        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code == "NoSuchDistribution":
                self.reporter.fail(
                    f"CloudFront distribution `{CLOUDFRONT_DISTRIBUTION_ID}` not found.",
                    error=exc,
                    fix_hint=(
                        "Verify in AWS Console → CloudFront → Distributions. "
                        f"Expected ID: {CLOUDFRONT_DISTRIBUTION_ID}"
                    ),
                )
            else:
                self.reporter.fail(
                    "Unexpected error creating CloudFront invalidation.",
                    error=exc,
                    fix_hint=(
                        "Ensure IAM permissions include cloudfront:CreateInvalidation."
                    ),
                )
            return False
        except Exception as exc:                               # noqa: BLE001
            self.reporter.fail("Unexpected error during CloudFront invalidation.", error=exc)
            return False

    # ────────────────────────────────────────────────────────────────────────
    # STAGE 10 — Verify AWS Route 53 DNS records for pyrepl.dev
    # ────────────────────────────────────────────────────────────────────────

    def stage_10_verify_route53(self) -> bool:
        self.reporter.start(
            f"Verify AWS Route 53 Hosted Zone `{ROUTE53_DOMAIN}` "
            f"(Zone ID: {ROUTE53_HOSTED_ZONE_ID}) DNS records"
        )
        try:
            self.reporter.progress(
                f"Calling route53:GetHostedZone for {ROUTE53_HOSTED_ZONE_ID}…"
            )
            hz = self.r53_client.get_hosted_zone(Id=ROUTE53_HOSTED_ZONE_ID)
            zone_name  = hz["HostedZone"]["Name"].rstrip(".")
            zone_count = hz["HostedZone"].get("ResourceRecordSetCount", "?")

            self.reporter.info(f"Zone Name       : {zone_name}")
            self.reporter.info(f"Zone Record Count: {zone_count}")

            # List record sets (first page)
            self.reporter.progress("Listing DNS record sets…")
            records_resp = self.r53_client.list_resource_record_sets(
                HostedZoneId=ROUTE53_HOSTED_ZONE_ID,
                MaxItems="20",
            )
            records = records_resp.get("ResourceRecordSets", [])

            # Check that an A/ALIAS record for the apex domain exists
            apex_record   = None
            www_record    = None
            for rec in records:
                rec_name = rec["Name"].rstrip(".")
                rec_type = rec["Type"]
                if rec_name == ROUTE53_DOMAIN and rec_type == "A":
                    apex_record = rec
                if rec_name == f"www.{ROUTE53_DOMAIN}" and rec_type == "A":
                    www_record = rec

            if apex_record:
                alias_target = (
                    apex_record.get("AliasTarget", {}).get("DNSName", "").rstrip(".")
                )
                self.reporter.info(
                    f"Apex A record: {ROUTE53_DOMAIN} → {alias_target or '(non-alias)'}"
                )
            else:
                self.reporter.info(
                    f"No A record found for apex domain `{ROUTE53_DOMAIN}` "
                    f"(may be OK if using CNAME or different record type)"
                )

            if www_record:
                www_alias = (
                    www_record.get("AliasTarget", {}).get("DNSName", "").rstrip(".")
                )
                self.reporter.info(
                    f"www A record : www.{ROUTE53_DOMAIN} → {www_alias or '(non-alias)'}"
                )

            self.reporter.success(
                f"Route 53 Hosted Zone `{ROUTE53_DOMAIN}` is present with "
                f"{zone_count} records"
            )
            return True

        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code == "NoSuchHostedZone":
                self.reporter.fail(
                    f"Route 53 Hosted Zone `{ROUTE53_HOSTED_ZONE_ID}` not found.",
                    error=exc,
                    fix_hint=(
                        "Verify in AWS Console → Route 53 → Hosted Zones. "
                        f"Expected Zone ID: {ROUTE53_HOSTED_ZONE_ID}"
                    ),
                )
            else:
                self.reporter.fail(
                    "Unexpected error verifying Route 53 Hosted Zone.",
                    error=exc,
                    fix_hint="Ensure IAM permissions include route53:GetHostedZone.",
                )
            return False
        except Exception as exc:                               # noqa: BLE001
            self.reporter.fail("Unexpected error verifying Route 53.", error=exc)
            return False

    # ────────────────────────────────────────────────────────────────────────
    # STAGE 11 — Smoke-test Lambda function URL directly
    # ────────────────────────────────────────────────────────────────────────

    def stage_11_health_check_lambda_url(self) -> bool:
        self.reporter.start(
            f"Health check — Lambda Function URL: {LAMBDA_FUNCTION_URL}"
        )
        max_retries = 5
        delay_secs  = 15

        for attempt in range(1, max_retries + 1):
            self.reporter.progress(
                f"Attempt {attempt}/{max_retries}: GET {LAMBDA_FUNCTION_URL}"
            )
            try:
                req = urllib.request.Request(
                    LAMBDA_FUNCTION_URL,
                    headers={"User-Agent": "update-aws-deployment/1.0"},
                )
                with urllib.request.urlopen(req, timeout=20) as resp:
                    status = resp.getcode()
                    if status in (200, 301, 302):
                        self.reporter.success(
                            f"Lambda URL is reachable (HTTP {status}) — "
                            f"{LAMBDA_FUNCTION_URL}"
                        )
                        return True
                    else:
                        self.reporter.info(f"HTTP {status} — will retry…")

            except urllib.error.HTTPError as exc:
                # 4xx from the app itself still means Lambda is running
                if exc.code in (400, 403, 404, 405):
                    self.reporter.info(
                        f"HTTP {exc.code} received — Lambda is running "
                        "(application-level response, not an infrastructure error)."
                    )
                    self.reporter.success(
                        f"Lambda URL is reachable (HTTP {exc.code}) — "
                        f"{LAMBDA_FUNCTION_URL}"
                    )
                    return True
                self.reporter.info(f"HTTP error {exc.code}: {exc.reason} — will retry…")

            except urllib.error.URLError as exc:
                self.reporter.info(f"Connection error: {exc.reason} — will retry…")
            except Exception as exc:                           # noqa: BLE001
                self.reporter.info(f"Unexpected error: {exc} — will retry…")

            if attempt < max_retries:
                self.reporter.progress(
                    f"Waiting {delay_secs}s before next attempt…"
                )
                time.sleep(delay_secs)

        self.reporter.fail(
            f"Lambda Function URL did not respond after {max_retries} attempts.",
            fix_hint=(
                f"1. Check Lambda logs: aws logs tail /aws/lambda/{LAMBDA_FUNCTION_NAME} "
                f"--follow --region {AWS_REGION}\n"
                f"   2. Verify Function URL in AWS Console → Lambda → {LAMBDA_FUNCTION_NAME} "
                "→ Configuration → Function URL.\n"
                f"   3. Test manually: curl -I {LAMBDA_FUNCTION_URL}"
            ),
        )
        return False

    # ────────────────────────────────────────────────────────────────────────
    # STAGE 12 — Final health check of public domain https://pyrepl.dev
    # ────────────────────────────────────────────────────────────────────────

    def stage_12_health_check_public_domain(self) -> bool:
        self.reporter.start(
            f"Final health check — public domain: https://{ROUTE53_DOMAIN}"
        )
        target_url  = f"https://{ROUTE53_DOMAIN}/"
        max_retries = 5
        delay_secs  = 20

        for attempt in range(1, max_retries + 1):
            self.reporter.progress(
                f"Attempt {attempt}/{max_retries}: GET {target_url}"
            )
            try:
                req = urllib.request.Request(
                    target_url,
                    headers={"User-Agent": "update-aws-deployment/1.0"},
                )
                with urllib.request.urlopen(req, timeout=20) as resp:
                    status = resp.getcode()
                    if status in (200, 301, 302):
                        self.reporter.success(
                            f"https://{ROUTE53_DOMAIN} is live and reachable "
                            f"(HTTP {status})"
                        )
                        return True
                    self.reporter.info(f"HTTP {status} — will retry…")

            except urllib.error.HTTPError as exc:
                if exc.code in (400, 403, 404, 405):
                    self.reporter.info(
                        f"HTTP {exc.code} — CloudFront/Lambda is responding "
                        "(application-level, not infrastructure failure)."
                    )
                    self.reporter.success(
                        f"https://{ROUTE53_DOMAIN} is reachable (HTTP {exc.code})"
                    )
                    return True
                self.reporter.info(f"HTTP error {exc.code}: {exc.reason} — will retry…")

            except urllib.error.URLError as exc:
                self.reporter.info(
                    f"Connection error: {exc.reason} — CloudFront/DNS may still be "
                    "propagating; will retry…"
                )
            except Exception as exc:                           # noqa: BLE001
                self.reporter.info(f"Unexpected error: {exc} — will retry…")

            if attempt < max_retries:
                self.reporter.progress(
                    f"Waiting {delay_secs}s before next attempt…"
                )
                time.sleep(delay_secs)

        self.reporter.fail(
            f"https://{ROUTE53_DOMAIN} did not respond after {max_retries} attempts.",
            fix_hint=(
                f"1. DNS/CloudFront propagation can take 5–30 minutes after a fresh "
                "invalidation.\n"
                f"   2. Verify CloudFront distribution status: "
                "AWS Console → CloudFront → Distributions → "
                f"{CLOUDFRONT_DISTRIBUTION_ID}.\n"
                f"   3. Verify Route 53 records point to {CLOUDFRONT_DOMAIN}.\n"
                f"   4. Test manually: curl -I https://{ROUTE53_DOMAIN}"
            ),
        )
        return False

    # ────────────────────────────────────────────────────────────────────────
    # MAIN PIPELINE
    # ────────────────────────────────────────────────────────────────────────

    def run(self) -> bool:
        if not self.preflight_check():
            print(
                f"\n{C.FAIL}{C.BOLD}Pre-flight checks failed. "
                f"Deployment aborted.{C.ENDC}\n"
            )
            return False

        stages = [
            ("Stage 1",  self.stage_01_read_version),
            ("Stage 2",  self.stage_02_build_app_container),
            ("Stage 3",  self.stage_03_build_db_init_container),
            ("Stage 4",  self.stage_04_push_to_dockerhub),
            ("Stage 5",  self.stage_05_ecr_auth),
            ("Stage 6",  self.stage_06_build_and_push_ecr),
            ("Stage 7",  self.stage_07_update_lambda),
            ("Stage 8",  self.stage_08_verify_api_gateway),
            ("Stage 9",  self.stage_09_invalidate_cloudfront),
            ("Stage 10", self.stage_10_verify_route53),
            ("Stage 11", self.stage_11_health_check_lambda_url),
            ("Stage 12", self.stage_12_health_check_public_domain),
        ]

        all_passed = True
        failed_at  = None

        for label, fn in stages:
            ok = fn()
            if not ok:
                all_passed = False
                failed_at  = label
                break   # Stop on first failure — later stages depend on earlier ones

        # ── Summary ─────────────────────────────────────────────────────────
        print(f"\n{C.BOLD}{'=' * 80}{C.ENDC}")
        if all_passed:
            print(
                f"{C.GREEN}{C.BOLD}"
                "✅  DEPLOYMENT UPDATE COMPLETE — ALL 12 STAGES PASSED\n"
                f"{C.ENDC}"
            )
            print(f"{C.GREEN}  App version  : {self.version}  ({self.image_tag}){C.ENDC}")
            print(
                f"{C.GREEN}  Docker Hub   : "
                f"{DOCKERHUB_USERNAME}/{DOCKER_APP_IMAGE}:{self.image_tag}  |  "
                f"{DOCKERHUB_USERNAME}/{DOCKER_DB_INIT_IMAGE}:{self.image_tag}"
                f"{C.ENDC}"
            )
            print(
                f"{C.GREEN}  AWS ECR      : {ECR_FULL_URI}:{self.image_tag}{C.ENDC}"
            )
            print(
                f"{C.GREEN}  Lambda Fn    : {LAMBDA_FUNCTION_NAME} → updated{C.ENDC}"
            )
            print(
                f"{C.GREEN}  API Gateway  : {API_GATEWAY_NAME} ({API_GATEWAY_ID}) → OK{C.ENDC}"
            )
            print(
                f"{C.GREEN}  CloudFront   : {CLOUDFRONT_DISTRIBUTION_ID} cache cleared{C.ENDC}"
            )
            print(
                f"{C.GREEN}  Route 53     : {ROUTE53_DOMAIN} → OK{C.ENDC}"
            )
            print(
                f"{C.GREEN}  Live URL     : https://{ROUTE53_DOMAIN}{C.ENDC}"
            )
        else:
            print(
                f"{C.FAIL}{C.BOLD}"
                f"❌  DEPLOYMENT UPDATE FAILED at {failed_at}\n"
                f"{C.ENDC}"
            )
            print(
                f"{C.WARNING}  Review the FAIL message above for details and fix hints."
                f"{C.ENDC}"
            )
        print(f"{C.BOLD}{'=' * 80}{C.ENDC}\n")

        return all_passed


# ============================================================================
# ENTRY POINT
# ============================================================================

def main() -> None:
    deployer = UpdateDeployer()
    success  = deployer.run()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
