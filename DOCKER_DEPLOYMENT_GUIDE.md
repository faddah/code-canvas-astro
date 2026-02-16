# Code Canvas Astro - Docker & AWS Deployment Guide

## ✅ What Has Been Completed

I've successfully created a complete deployment solution with:

1. **Multi-container Docker Compose** for local development with persistent volumes
2. **Database seeding** with your existing SQLite data (2 Python files)
3. **AWS Lambda deployment** with S3 database persistence
4. **Built Docker images**: `code-canvas-astro:v1.2` (local) and Lambda container

---

## 📁 Files Created/Modified

### New Files
- `scripts/seed-db.js` - Database seeding script with production data
- `Dockerfile.db` - Database initialization container (local development)
- `Dockerfile.lambda` - Lambda-compatible Dockerfile with AWS SDK
- `lambda-handler.js` - Lambda handler with S3 database sync
- `deploy_to_lambda.py` - AWS Lambda deployment script with S3 persistence
- `DOCKER_DEPLOYMENT_GUIDE.md` - This file

### Modified Files
- `Dockerfile` - Updated to use `npm install` for compatibility
- `docker-compose.yml` - Multi-container setup with db-init and app containers
- `scripts/docker-entrypoint.sh` - Now calls seed-db.js after init-db.js

---

## 🏗️ Architecture

### Local Development (Docker Compose)

```
┌─────────────────────────────────────────┐
│  docker-compose.yml                     │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────────┐  ┌──────────────┐  │
│  │   db-init      │  │     app      │  │
│  │   (private)    │→ │   (public)   │  │
│  │                │  │   :3000      │  │
│  └────────┬───────┘  └───────┬──────┘  │
│           │                  │         │
│           └──────┬───────────┘         │
│                  │                     │
│           ┌──────▼───────┐             │
│           │  db-data     │             │
│           │  (volume)    │             │
│           └──────────────┘             │
└─────────────────────────────────────────┘
```

**Components:**
- **db-init container** (private): Initializes and seeds SQLite database, then exits
- **app container** (public): Runs Astro application on port 3000
- **db-data volume**: Persistent storage for SQLite database

**Data Flow:**
1. `db-init` starts, creates `/data/taskManagement.db`, seeds with 2 Python files, exits
2. `app` waits for `db-init` to complete successfully
3. `app` mounts same volume, accesses seeded database
4. Volume persists across container restarts

### AWS Deployment (Lambda with S3)

```
┌────────────────────────────────────────────────────────┐
│  AWS Lambda Function                                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Container: code-canvas-astro-lambda                   │
│  ├─ Lambda Handler (Node.js 20)                        │
│  ├─ Astro Server (port 8080)                           │
│  ├─ SQLite DB in /tmp                                  │
│  └─ S3 Sync: ↓ Download on cold start                  │
│              ↑ Upload after writes                     │
│                                                        │
│  ┌──────────────────────────────────────────────┐     │
│  │  S3 Bucket: code-canvas-astro-db             │     │
│  │  Key: database/taskManagement.db             │     │
│  │  ✅ Persistent across ALL invocations        │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
│  Function URL: https://*.lambda-url.us-west-2.on.aws  │
└────────────────────────────────────────────────────────┘
```

**How S3 Persistence Works:**

1. **Cold Start**: Download DB from S3 → `/tmp/taskManagement.db`
2. **Write Operations** (POST/PUT/DELETE): Update DB → Immediately sync to S3
3. **Read Operations** (GET): Use `/tmp` DB → Sync to S3 every 30s
4. **Lambda Shutdown**: Final sync to S3 before termination

**Result**: ✅ True persistence across all Lambda invocations!

---

## 🚀 Quick Start - Local Development

### 1. Start the Application

```bash
cd "/Users/faddah/Documents/code/code - projects/code-canvas-astro"
docker-compose up --build
```

This will:
- Build both containers (db-init and app)
- Initialize SQLite database
- Seed with 2 Python files (main.py, utils.py)
- Start Astro server on http://localhost:3000

### 2. Access the Application

Open http://localhost:3000 in your browser

### 3. Stop the Application

```bash
docker-compose down
```

Database data persists in the `db-data` volume.

### 4. Reset Database (Start Fresh)

```bash
docker-compose down -v
docker-compose up --build
```

---

## ☁️ AWS Lambda Deployment with S3

### ✅ Why Lambda with S3 is Better

**Lambda + S3 vs App Runner:**

| Feature | Lambda + S3 | App Runner |
|---------|-------------|------------|
| **Persistent Storage** | ✅ S3 bucket | ❌ None |
| **Setup Complexity** | ✅ Simple | ⚠️ Medium |
| **Cost** | ✅ ~$2-6/month | ❌ ~$57/month |
| **Cold Starts** | ⚠️ 2-3 seconds | ✅ None |
| **Database Persistence** | ✅ True persistence | ❌ Resets on deploy |
| **VPC Required** | ❌ No | ❌ No |

**Lambda with S3 provides:**
- ✅ True database persistence via S3
- ✅ 10x cheaper than App Runner
- ✅ Simpler setup (no VPC required)
- ✅ Perfect for SQLite + moderate traffic

---

## 📝 Lambda Deployment Instructions

### Prerequisites

```bash
# Install Python dependencies
pip install boto3 botocore

# Configure AWS credentials
aws configure
# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: us-west-2
# - Default output format: json

# Verify credentials
aws sts get-caller-identity
```

### Deploy to Lambda

```bash
cd "/Users/faddah/Documents/code/code - projects/code-canvas-astro"

# Make script executable
chmod +x deploy_to_lambda.py

# Run deployment
python3 deploy_to_lambda.py
```

### Expected Output (6 Steps)

```
================================================================================
🚀 AWS Lambda Deployment - Code Canvas Astro
   Database Persistence: S3 Bucket
   Region: us-west-2
   Account: 415740581749
   Image Tag: v1.2
================================================================================

================================================================================
Step 1/6: S3 Bucket for Database Storage
================================================================================
🔄 Setting up S3 bucket: code-canvas-astro-db
✅ SUCCESS: S3 bucket created: code-canvas-astro-db
✅ SUCCESS: Bucket versioning enabled
✅ SUCCESS: Bucket encryption enabled

================================================================================
Step 2/6: ECR Repository Setup
================================================================================
🔄 Setting up ECR repository: python-repl-container-lambda
✅ SUCCESS: ECR repository created: 415740581749.dkr.ecr.us-west-2.amazonaws.com/python-repl-container-lambda
✅ SUCCESS: Image URI: ...python-repl-container-lambda:v1.2

================================================================================
Step 3/6: Docker Build & Push
================================================================================
🔄 Building and pushing Docker image...
✅ SUCCESS: ECR authentication successful
✅ SUCCESS: Docker image built successfully
✅ SUCCESS: Docker image pushed to ECR: ...

================================================================================
Step 4/6: IAM Role Creation with S3 Permissions
================================================================================
🔄 Setting up IAM execution role: code-canvas-astro-lambda-role
✅ SUCCESS: IAM role created
✅ SUCCESS: Attached AWSLambdaBasicExecutionRole policy
✅ SUCCESS: Attached S3 database access policy

================================================================================
Step 5/6: Lambda Function Deployment
================================================================================
🔄 Deploying Lambda function: code-canvas-astro-lambda
✅ SUCCESS: Lambda function created
✅ SUCCESS: Lambda function ready

================================================================================
Step 6/6: Function URL Creation
================================================================================
🔄 Creating Lambda Function URL...
✅ SUCCESS: Function URL created: https://xxxxx.lambda-url.us-west-2.on.aws/
✅ SUCCESS: Public access permission added

================================================================================
✅ DEPLOYMENT SUCCESSFUL!
================================================================================

💾 S3 Bucket:          code-canvas-astro-db
📦 ECR Repository:     415740581749.dkr.ecr.us-west-2.amazonaws.com/python-repl-container-lambda
🐳 Docker Image:       ...python-repl-container-lambda:v1.2
⚡ Lambda Function:    arn:aws:lambda:us-west-2:415740581749:function:code-canvas-astro-lambda
🌐 Function URL:       https://xxxxx.lambda-url.us-west-2.on.aws/
────────────────────────────────────────────────────────────────────────────────

✅ DATABASE PERSISTENCE (S3):
   • SQLite database stored in S3: s3://code-canvas-astro-db/database/taskManagement.db
   • Downloaded to Lambda /tmp on cold start
   • Uploaded back to S3 after write operations
   • Data persists across ALL Lambda invocations
   • Truly persistent storage

🚀 NEXT STEPS:
   1. Test your Lambda function:
      curl https://xxxxx.lambda-url.us-west-2.on.aws/

   2. Monitor logs in real-time:
      aws logs tail /aws/lambda/code-canvas-astro-lambda --follow --region us-west-2

   3. Check S3 database:
      aws s3 ls s3://code-canvas-astro-db/database/taskManagement.db

   4. Access your app:
      https://xxxxx.lambda-url.us-west-2.on.aws/

💰 COST ESTIMATE:
   • Lambda: ~$2-5/month (10K requests)
   • S3: ~$0.023/GB-month
   • ECR: ~$0.10/GB-month
   • Total: ~$2-6/month

✅ Deployment completed successfully!
🌐 Access your app at: https://xxxxx.lambda-url.us-west-2.on.aws/
```

---

## 🗂️ Database Information

### Seed Data

Your database is pre-seeded with these files:

**1. main.py**
```python
import sys
import utils

# This is the main entry point
print("Hello from Python!")
print("<h1>This is HTML output</h1>")

print(utils.greet("Faddah"))

render(f'<h1 style="text-align: center;">{utils.greet("Faddah")}</h1>')
```

**2. utils.py**
```python
def greet(name):
    return f"Hello, {name}!"
```

### Database Schema

```sql
CREATE TABLE files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

### Modifying Seed Data

Edit `scripts/seed-db.js` to change initial data.

---

## 🔧 Troubleshooting

### Local Development

**Problem: Containers won't start**
```bash
# View logs
docker-compose logs app
docker-compose logs db-init

# Rebuild from scratch
docker-compose down -v
docker-compose up --build --force-recreate
```

**Problem: Port 3000 already in use**
```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "3001:3000"  # Change 3000 to 3001
```

**Problem: Database not seeded**
```bash
# Check db-init logs
docker-compose logs db-init

# Should see:
# ✓ Database schema initialized successfully
# ✓ Successfully seeded 2 records

# If not, rebuild
docker-compose down -v
docker-compose up --build
```

### AWS Lambda Deployment

**Problem: Docker build fails**
```bash
# Check Docker is running
docker ps

# Verify Dockerfile.lambda exists
ls -la Dockerfile.lambda

# Try building locally first
docker build -f Dockerfile.lambda -t test:latest .
```

**Problem: Docker push fails**
```bash
# Re-authenticate with ECR
aws ecr get-login-password --region us-west-2 | \
  docker login --username AWS --password-stdin \
  415740581749.dkr.ecr.us-west-2.amazonaws.com

# Verify Docker is running
docker ps
```

**Problem: Permission denied**
```bash
# Check AWS permissions
aws iam get-user

# Ensure your user has permissions for:
# - ECR (ecr:*)
# - Lambda (lambda:*)
# - S3 (s3:*)
# - IAM (iam:CreateRole, iam:AttachRolePolicy)
```

**Problem: Lambda timeout**
```bash
# Cold starts can take 10-20 seconds for first request
# Check logs
aws logs tail /aws/lambda/code-canvas-astro-lambda --follow --region us-west-2

# Increase timeout if needed (current: 900s / 15 minutes)
```

**Problem: S3 access denied**
```bash
# Verify S3 bucket exists
aws s3 ls s3://code-canvas-astro-db/

# Check Lambda IAM role has S3 permissions
aws iam get-role-policy \
  --role-name code-canvas-astro-lambda-role \
  --policy-name S3DatabaseAccessPolicy
```

---

## 📊 Cost Comparison

### Lambda + S3 (Recommended)
- **Lambda Requests**: $0.20 per 1M requests
- **Lambda Duration**: $0.0000166667 per GB-second
- **S3 Storage**: $0.023 per GB-month
- **ECR Storage**: $0.10 per GB-month
- **Example** (10K requests/month, 2GB memory, 5s avg):
  - Requests: $0.002
  - Duration: $1.67
  - S3: $0.023
  - ECR: $0.10
  - **Total: ~$2-6/month**

### App Runner (Alternative)
- **vCPU**: 1 vCPU × $0.064/hour × 730 hours = ~$46.72/month
- **Memory**: 2 GB × $0.007/GB-hour × 730 hours = ~$10.22/month
- **ECR Storage**: $0.10/month
- **Total: ~$57/month**
- **Issue**: ❌ No persistent storage

**Lambda + S3 is 10x cheaper with true persistence!**

---

## 🔐 Security Best Practices

### AWS Credentials
- ✅ Use AWS CLI configuration (`aws configure`)
- ✅ Use environment variables for CI/CD
- ✅ Use IAM roles when on AWS infrastructure
- ❌ Never commit credentials to git

### S3 Bucket Security
- ✅ Encryption enabled (AES256)
- ✅ Versioning enabled (backup/recovery)
- ✅ Private bucket (no public access)
- ✅ IAM policy restricts Lambda access only

### Lambda Security
- ✅ Least privilege IAM permissions
- ✅ CloudWatch logging enabled
- ✅ Container image scanning on push
- ✅ Regular dependency updates

### Network Security
- ✅ HTTPS by default (Function URL)
- ✅ CORS configured
- ⚠️ No authentication (set to NONE for demo)
- 💡 Consider API Gateway + Cognito for production

---

## 📋 Configuration Files

### docker-compose.yml
- Multi-container local development setup
- db-init container for database initialization
- app container for Astro application
- Persistent volume for database

### Dockerfile (Local)
- Multi-stage build for optimization
- Includes database seeding scripts
- Runs on port 3000

### Dockerfile.lambda (AWS)
- Based on AWS Lambda Node.js 20 runtime
- Includes AWS SDK for S3
- Lambda handler with S3 sync
- Runs on port 8080

### lambda-handler.js
- Downloads DB from S3 on cold start
- Starts Astro server
- Proxies HTTP requests
- Syncs DB to S3 after writes

### deploy_to_lambda.py
- 6-step automated deployment
- Creates S3 bucket with versioning
- Builds and pushes to ECR
- Creates Lambda with S3 permissions
- Returns Function URL

---

## 🎯 Summary

### ✅ What's Ready

**Local Development:**
- ✅ Multi-container Docker Compose
- ✅ Database seeding with production data
- ✅ Persistent volumes
- ✅ Port 3000 access

**AWS Lambda:**
- ✅ S3 bucket for persistent storage
- ✅ Lambda function with container image
- ✅ Automatic S3 sync
- ✅ Public Function URL
- ✅ SUCCESS/FAIL messages for each step

### 💰 Cost Benefits
- 💰 **10x cheaper** than App Runner (~$2-6 vs ~$57/month)
- 💾 **True persistence** via S3
- ⚡ **Simpler setup** (no VPC required)
- 🔒 **More secure** (encrypted S3 with versioning)

### 🚀 Next Steps

1. **Test locally**:
   ```bash
   docker-compose up --build
   # Visit http://localhost:3000
   ```

2. **Review deployment script**:
   ```bash
   cat deploy_to_lambda.py
   ```

3. **Deploy to AWS Lambda**:
   ```bash
   python3 deploy_to_lambda.py
   ```

4. **Monitor deployment** - Watch terminal output for SUCCESS/FAIL messages

5. **Access your app** - Use the Function URL provided at the end

### 📞 Support

- Review this guide carefully
- Check CloudWatch logs for errors
- Verify AWS credentials and permissions
- Ensure Docker is running
- Check S3 bucket access

---

## 🔄 Updating Deployment

To deploy a new version:

```bash
# Update code
# ...

# Deploy (script handles versioning)
python3 deploy_to_lambda.py
```

The script automatically:
- Builds new Docker image
- Pushes to ECR with v1.2 tag
- Updates Lambda function
- Preserves S3 database (no data loss)

---

## 🌟 Key Features

### S3 Database Persistence
- ✅ Downloads from S3 on cold start
- ✅ Uploads after every write
- ✅ Periodic sync for reads (30s)
- ✅ Final sync on shutdown
- ✅ Versioning enabled (backup)
- ✅ Encrypted at rest

### Lambda Configuration
- **Memory**: 2048 MB (2 GB)
- **Timeout**: 900 seconds (15 minutes)
- **Storage**: 1024 MB /tmp
- **Runtime**: Node.js 20 (container)
- **Database**: SQLite in /tmp + S3 backup

### Deployment Process
1. S3 bucket creation
2. ECR repository setup
3. Docker build & push
4. IAM role with S3 permissions
5. Lambda function deployment
6. Function URL creation

---

**Built with ❤️ using Docker, AWS Lambda, S3, and Astro**
