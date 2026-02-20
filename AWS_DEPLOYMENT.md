# AWS Deployment Guide — pyrepl.dev / Code Canvas Astro

This document covers two scenarios:

1. **[Initial Setup](#initial-setup)** — first-time deployment of the full AWS infrastructure stack (Route 53, ACM, CloudFront, API Gateway, Lambda, ECR).
2. **[Updating a Live Deployment](#updating-a-live-deployment)** — pushing new code after the infrastructure is already running, using `update_aws_deployment.py`.

---

## AWS Service Architecture

```
Browser → pyrepl.dev (Route 53)
            └→ CloudFront Distribution (E8UQ2BAGKYYM0 / d367a5xu7jwhol.cloudfront.net)
                  └→ API Gateway (pyrepl-api / pvh7sgwr49)
                        └→ Lambda Function (code-canvas-astro-lambda)
                              └→ ECR Container (python-repl-container-lambda)
```

**Resource Reference:**

| Resource | ID / ARN |
|---|---|
| Route 53 Hosted Zone | `Z06161484WRKVMIQUBIG` (pyrepl.dev) |
| CloudFront Distribution | `E8UQ2BAGKYYM0` |
| CloudFront Domain | `d367a5xu7jwhol.cloudfront.net` |
| API Gateway | `pvh7sgwr49` (pyrepl-api) |
| Lambda Function | `arn:aws:lambda:us-west-2:415740581749:function:code-canvas-astro-lambda` |
| Lambda Function URL | `https://jb6uzlmmok5wxyr2nzdci3wdfi0rcush.lambda-url.us-west-2.on.aws/` |
| ECR Repository | `arn:aws:ecr:us-west-2:415740581749:repository/python-repl-container-lambda` |
| ECR Repository URI | `415740581749.dkr.ecr.us-west-2.amazonaws.com/python-repl-container-lambda` |
| AWS Region | `us-west-2` |
| AWS Account | `415740581749` |

---

## Updating a Live Deployment

> Use this section whenever you have pushed new code to the GitHub repository and want to rebuild the Docker containers, push them to Docker Hub and AWS ECR, and propagate the update through the entire AWS service chain.

### Prerequisites for Updating

- Python 3.8+ installed
- `boto3` and `botocore` installed: `pip install boto3 botocore`
- AWS credentials configured (see [AWS Credentials Setup](#aws-credentials-setup))
- Docker Desktop running
- Docker Hub account credentials available
- `DOCKERHUB_USERNAME` set in `update_aws_deployment.py` (one-time setup — see below)

### One-Time Script Configuration

Open `update_aws_deployment.py` and set your Docker Hub username near the top of the file:

```python
DOCKERHUB_USERNAME = "your-dockerhub-username"   # <── set this to your Docker Hub username
```

Save the file. You only need to do this once.

---

### Update Workflow — Step by Step

Follow these steps in order every time you want to deploy updated code.

#### Step 1 — Stage, commit, and push all code changes to GitHub

Make sure all of your code changes are committed and pushed before bumping the version:

```bash
# Stage all changed files
git add -A

# Commit with a descriptive message
git commit -m "Your descriptive commit message here"

# Push to GitHub
git push
```

> **Why:** The version bump in Step 2 creates its own commit. It is cleaner to separate your feature/fix commits from the version-bump commit.

#### Step 2 — Bump the version in package.json using npm version

Choose the appropriate version bump type based on your changes:

```bash
# Patch bump (1.2.0 → 1.2.1) — for bug fixes and small changes
npm version patch

# Minor bump (1.2.0 → 1.3.0) — for new features, backwards-compatible
npm version minor

# Major bump (1.2.0 → 2.0.0) — for breaking changes
npm version major
```

`npm version` automatically:
- Updates the `version` field in `package.json`
- Creates a git commit for the version bump
- Creates a git tag (e.g. `v1.2.1`)

#### Step 3 — Push the version bump commit and its tag to GitHub

```bash
# Push the version-bump commit
git push

# Push the version tag (e.g. v1.2.1)
git push --tags
```

> **Why both commands:** `git push` sends the commit; `git push --tags` sends the annotated version tag separately. Both are needed so GitHub and the deployment script can reference the correct version.

#### Step 4 — Run the update deployment script

```bash
python3 update_aws_deployment.py
```

The script will run **12 stages** and print a clear `SUCCESS` or `FAIL` status after each one:

| Stage | Description |
|---|---|
| **STAGE 1** | Read & validate version from `package.json` |
| **STAGE 2** | Build Docker app container (`code-canvas-astro-app:v[VER]`) from `Dockerfile` |
| **STAGE 3** | Build Docker db-init container (`code-canvas-astro-db-init:v[VER]`) from `Dockerfile.db` |
| **STAGE 4** | Log in to Docker Hub and push both containers (versioned tag + `:latest`) |
| **STAGE 5** | Authenticate with AWS ECR (via boto3 token — no AWS CLI required) |
| **STAGE 6** | Build Lambda Docker image from `Dockerfile.lambda` and push to AWS ECR `python-repl-container-lambda:v[VER]` |
| **STAGE 7** | Update AWS Lambda function `code-canvas-astro-lambda` with the new ECR image and wait for update to complete |
| **STAGE 8** | Verify AWS API Gateway `pyrepl-api` is operational |
| **STAGE 9** | Invalidate AWS CloudFront Distribution `E8UQ2BAGKYYM0` cache (`/*`) and wait for completion |
| **STAGE 10** | Verify AWS Route 53 Hosted Zone `pyrepl.dev` DNS records are intact |
| **STAGE 11** | HTTP health check of the Lambda Function URL directly |
| **STAGE 12** | HTTP health check of the public domain `https://pyrepl.dev` |

If any stage fails, the script stops immediately and prints a detailed error message and a **Fix:** hint explaining what went wrong and how to resolve it.

#### Step 5 — Verify the live site

After the script reports all 12 stages as `SUCCESS`, open your browser or run:

```bash
curl -I https://pyrepl.dev
```

You should receive an `HTTP/2 200` (or a redirect) response.

---

### Troubleshooting Updates

#### Docker Hub push fails (Stage 4)

Ensure you are logged in to Docker Hub before running the script:

```bash
docker login --username your-dockerhub-username
```

Or set credentials via environment variable and pass them with `--password-stdin`:

```bash
echo "$DOCKER_PASSWORD" | docker login --username your-dockerhub-username --password-stdin
```

#### ECR authentication fails (Stage 5)

Verify your AWS credentials have the `ecr:GetAuthorizationToken` permission:

```bash
aws ecr get-login-password --region us-west-2
```

#### Lambda update fails (Stage 7)

Check that your AWS credentials have the following Lambda permissions:

- `lambda:UpdateFunctionCode`
- `lambda:UpdateFunctionConfiguration`
- `lambda:GetFunction`

Also verify the function exists:

```bash
aws lambda get-function --function-name code-canvas-astro-lambda --region us-west-2
```

#### CloudFront invalidation slow or fails (Stage 9)

CloudFront invalidations normally complete in 1–5 minutes. If the waiter times out, create an invalidation manually:

```bash
aws cloudfront create-invalidation \
  --distribution-id E8UQ2BAGKYYM0 \
  --paths "/*"
```

#### Public domain not responding (Stage 12)

- CloudFront cache clearing and DNS propagation can take 5–30 minutes after a fresh deployment.
- Monitor Lambda logs in real time:

```bash
aws logs tail /aws/lambda/code-canvas-astro-lambda --follow --region us-west-2
```

- Test the Lambda Function URL directly (bypasses CloudFront):

```bash
curl -I https://jb6uzlmmok5wxyr2nzdci3wdfi0rcush.lambda-url.us-west-2.on.aws/
```

---

## Initial Setup

> Use this section only for the very first deployment when the AWS infrastructure does not yet exist. If the infrastructure is already running, go to [Updating a Live Deployment](#updating-a-live-deployment) above.

### Prerequisites for Initial Setup

1. AWS CLI configured with credentials
2. AWS CDK CLI installed: `npm install -g aws-cdk`
3. Python 3.8+ installed
4. Python dependencies installed:

```bash
pip install -r requirements-aws-deploy.txt
```

### CDK Bootstrap (first time only)

```bash
cdk bootstrap aws://415740581749/us-east-1
```

> ACM certificates for CloudFront **must** be created in `us-east-1` even though the rest of the infrastructure is in `us-west-2`.

### Initial Deployment Steps

#### 1. Synthesize the CDK stack

```bash
python3 aws_route53_cloudfront_deploy.py
```

This synthesizes the CloudFormation template for the Route 53 / ACM / CloudFront stack.

#### 2. Deploy the CDK stack

```bash
cdk deploy PyReplDevStack --require-approval never
```

#### 3. Deploy the Lambda container

```bash
python3 deploy_to_lambda.py
```

This creates or updates:
- The S3 bucket for SQLite database persistence (`code-canvas-astro-db`)
- The ECR repository (`python-repl-container-lambda`)
- The Lambda function (`code-canvas-astro-lambda`) with a Function URL

#### 4. Update Porkbun Nameservers

After the CDK stack deploys:

1. Go to **AWS Console → Route 53 → Hosted Zones → pyrepl.dev**
2. Copy the 4 NS (nameserver) records
3. Log in to [Porkbun.com](https://porkbun.com)
4. Navigate to your domain settings for `pyrepl.dev`
5. Replace the existing nameservers with the 4 AWS nameservers
6. Save changes

**Current Porkbun nameservers (to be replaced):**

- curitiba.ns.porkbun.com
- fortaleza.ns.porkbun.com
- maceio.ns.porkbun.com
- salvador.ns.porkbun.com

#### 5. Wait for DNS Propagation

DNS propagation typically takes 15–30 minutes but can take up to 48 hours.

Check propagation status:

```bash
dig pyrepl.dev
dig pyrepl.dev @8.8.8.8
```

#### 6. Verify the Initial Deployment

```bash
# Test HTTPS access
curl -I https://pyrepl.dev
```

### What the Initial Deployment Creates

| Resource | Details |
|---|---|
| Route 53 Hosted Zone | `pyrepl.dev` |
| ACM SSL Certificate | Auto-renewing, covers `pyrepl.dev` and `*.pyrepl.dev` |
| CloudFront Distribution | Points to the Lambda Function URL |
| DNS A Records | `pyrepl.dev` and `www.pyrepl.dev` → CloudFront |
| ECR Repository | `python-repl-container-lambda` |
| Lambda Function | `code-canvas-astro-lambda` with Function URL |
| S3 Bucket | `code-canvas-astro-db` for SQLite database persistence |

---

## AWS Credentials Setup

Configure AWS credentials using one of these methods (in order of preference):

**Option A — AWS CLI (recommended for local development):**

```bash
aws configure
# Enter: AWS Access Key ID, Secret Access Key, Region (us-west-2), Output format (json)
```

**Option B — Environment variables:**

```bash
export AWS_ACCESS_KEY_ID=your-access-key-id
export AWS_SECRET_ACCESS_KEY=your-secret-access-key
export AWS_DEFAULT_REGION=us-west-2
```

**Option C — IAM Role** (recommended for CI/CD and EC2/ECS environments): attach the role to your compute resource; boto3 will pick it up automatically.

### Required IAM Permissions

The AWS credentials used for deployment need at minimum:

- `ecr:GetAuthorizationToken`
- `ecr:BatchCheckLayerAvailability`
- `ecr:GetDownloadUrlForLayer`
- `ecr:BatchGetImage`
- `ecr:InitiateLayerUpload`
- `ecr:UploadLayerPart`
- `ecr:CompleteLayerUpload`
- `ecr:PutImage`
- `ecr:DescribeRepositories`
- `lambda:UpdateFunctionCode`
- `lambda:UpdateFunctionConfiguration`
- `lambda:GetFunction`
- `apigateway:GET`
- `cloudfront:CreateInvalidation`
- `route53:GetHostedZone`
- `route53:ListResourceRecordSets`

---

## Deployment Scripts Reference

| Script | Purpose |
|---|---|
| `update_aws_deployment.py` | **Primary update script** — rebuilds containers, pushes to Docker Hub & ECR, updates Lambda, invalidates CloudFront cache, and verifies the full service chain |
| `deploy_to_lambda.py` | Initial Lambda deployment with S3 database persistence |
| `aws_route53_cloudfront_deploy.py` | Initial CDK stack for Route 53, ACM, and CloudFront |
| `deploy_to_aws.py` | CDK stack synthesis for ECR + Lambda (initial setup reference) |
| `deploy_lambda.py` | Standalone ECR + Lambda deployment (initial setup reference) |

---

## Cleanup

To remove all AWS resources created by the CDK stack:

```bash
cdk destroy PyReplDevStack
```

> **Note:** Remember to revert the Porkbun nameservers to the originals if you destroy the stack, or your domain will stop resolving.

The S3 bucket (`code-canvas-astro-db`) and ECR repository (`python-repl-container-lambda`) use a `RETAIN` removal policy and will **not** be deleted by `cdk destroy`. Delete them manually in the AWS Console or with the AWS CLI if needed.
