# AWS Lambda Deployment Guide with S3 Database Persistence

## 🎯 Overview

This guide covers deploying the Code Canvas Astro application to AWS Lambda with **S3-based SQLite database persistence**. This solution provides true database persistence at a fraction of the cost of other AWS services.

---

## 🔒 Security First: Configure AWS Credentials

**NEVER hardcode credentials in scripts or commit them to version control!**

### Option 1: AWS CLI Configuration (Recommended)

```bash
aws configure
```

Enter your credentials when prompted:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-west-2`
- Default output format: `json`

### Option 2: Environment Variables

```bash
export AWS_ACCESS_KEY_ID=<your_access_key>
export AWS_SECRET_ACCESS_KEY=<your_secret_key>
export AWS_DEFAULT_REGION=us-west-2
```

### Option 3: AWS IAM Role (Best for EC2/ECS)

If running on AWS infrastructure, attach an IAM role with appropriate permissions.

---

## 📋 Prerequisites

1. **Python 3.8+** installed
2. **Docker** installed and running
3. **AWS CLI** installed and configured
4. **boto3** Python library

Install Python dependencies:

```bash
pip install boto3 botocore
```

---

## 🚀 Quick Deploy

### One-Command Deployment

```bash
python3 deploy_to_lambda.py
```

This script performs **6 automated steps**:

1. ✅ Creates S3 bucket `code-canvas-astro-db` with versioning & encryption
2. ✅ Creates ECR repository `python-repl-container-lambda`
3. ✅ Builds Lambda Docker image with AWS SDK for S3
4. ✅ Pushes image to ECR with tag `v1.2`
5. ✅ Creates Lambda function `code-canvas-astro-lambda` with S3 permissions
6. ✅ Creates public Function URL with CORS enabled

Each step shows **SUCCESS** or **FAIL** with detailed error messages.

---

## 📦 What Gets Created

### S3 Bucket (Database Storage)

- **Name**: `code-canvas-astro-db`
- **Key**: `database/taskManagement.db`
- **Versioning**: Enabled (backup/recovery)
- **Encryption**: AES256 (at rest)
- **Region**: `us-west-2`

### ECR Repository

- **Name**: `python-repl-container-lambda`
- **Tag**: `v1.2`
- **Scanning**: Enabled on push
- **Region**: `us-west-2`

### Lambda Function

- **Name**: `code-canvas-astro-lambda`
- **Type**: Container Image
- **Memory**: 2048 MB (2 GB)
- **Timeout**: 900 seconds (15 minutes)
- **Storage**: 1024 MB ephemeral (/tmp)
- **Runtime**: Node.js 20 (via container)

### Lambda Handler Features

- Downloads DB from S3 on cold start
- Starts Astro server on port 8080
- Proxies HTTP requests to Astro
- Uploads DB to S3 after write operations
- Periodic sync for read operations (30s)
- Final sync before Lambda shutdown

### IAM Roles

**Execution Role**: `code-canvas-astro-lambda-role`
- AWSLambdaBasicExecutionRole (CloudWatch logs)
- S3 read/write permissions for database bucket

**Permissions**:
- `s3:GetObject` - Download database
- `s3:PutObject` - Upload database
- `s3:HeadObject` - Check if exists
- `s3:ListBucket` - List bucket contents

### Function URL

- **Auth Type**: NONE (public access)
- **CORS**: Enabled for all origins
- **Format**: `https://*.lambda-url.us-west-2.on.aws/`

---

## 💾 S3 Database Persistence

### How It Works

```
┌──────────────────────────────────────────────────┐
│ Lambda Cold Start                                │
│ 1. Download: S3 → /tmp/taskManagement.db        │
│ 2. Start Astro server                           │
│ 3. Ready to serve requests                       │
└──────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────┐
│ Write Request (POST/PUT/DELETE)                  │
│ 1. Process request through Astro                 │
│ 2. Update database in /tmp                       │
│ 3. IMMEDIATELY sync to S3                        │
└──────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────┐
│ Read Request (GET)                               │
│ 1. Process request from /tmp database            │
│ 2. Sync to S3 every 30 seconds (if needed)       │
└──────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────┐
│ Lambda Shutdown                                  │
│ 1. Final sync to S3                              │
│ 2. Ensure no data loss                           │
└──────────────────────────────────────────────────┘
```

**Result**: ✅ True persistence across all Lambda invocations!

---

## 🔧 Manual Deployment (Step-by-Step)

If you prefer manual control or want to understand each step:

### 1. Create S3 Bucket

```bash
aws s3api create-bucket \
  --bucket code-canvas-astro-db \
  --region us-west-2 \
  --create-bucket-configuration LocationConstraint=us-west-2

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket code-canvas-astro-db \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket code-canvas-astro-db \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

### 2. Create ECR Repository

```bash
aws ecr create-repository \
  --repository-name python-repl-container-lambda \
  --region us-west-2
```

### 3. Build & Push Lambda Docker Image

```bash
# Login to ECR
aws ecr get-login-password --region us-west-2 | \
  docker login --username AWS --password-stdin \
  415740581749.dkr.ecr.us-west-2.amazonaws.com

# Build Lambda image
docker build --platform linux/amd64 \
  -t python-repl-container-lambda:v1.2 \
  -f Dockerfile.lambda .

# Tag for ECR
docker tag python-repl-container-lambda:v1.2 \
  415740581749.dkr.ecr.us-west-2.amazonaws.com/python-repl-container-lambda:v1.2

# Push to ECR
docker push 415740581749.dkr.ecr.us-west-2.amazonaws.com/python-repl-container-lambda:v1.2
```

### 4. Create IAM Execution Role

```bash
# Create role
aws iam create-role \
  --role-name code-canvas-astro-lambda-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach basic Lambda execution policy
aws iam attach-role-policy \
  --role-name code-canvas-astro-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Add S3 access policy
aws iam put-role-policy \
  --role-name code-canvas-astro-lambda-role \
  --policy-name S3DatabaseAccessPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["s3:GetObject", "s3:PutObject", "s3:HeadObject"],
        "Resource": "arn:aws:s3:::code-canvas-astro-db/*"
      },
      {
        "Effect": "Allow",
        "Action": ["s3:ListBucket"],
        "Resource": "arn:aws:s3:::code-canvas-astro-db"
      }
    ]
  }'
```

### 5. Create Lambda Function

```bash
aws lambda create-function \
  --function-name code-canvas-astro-lambda \
  --package-type Image \
  --code ImageUri=415740581749.dkr.ecr.us-west-2.amazonaws.com/python-repl-container-lambda:v1.2 \
  --role arn:aws:iam::415740581749:role/code-canvas-astro-lambda-role \
  --timeout 900 \
  --memory-size 2048 \
  --ephemeral-storage Size=1024 \
  --environment Variables='{
    NODE_ENV=production,
    S3_BUCKET_NAME=code-canvas-astro-db,
    S3_DB_KEY=database/taskManagement.db,
    AWS_REGION=us-west-2,
    PORT=8080
  }' \
  --region us-west-2
```

### 6. Create Function URL

```bash
aws lambda create-function-url-config \
  --function-name code-canvas-astro-lambda \
  --auth-type NONE \
  --cors AllowOrigins="*",AllowMethods="*",AllowHeaders="*" \
  --region us-west-2

# Add public access permission
aws lambda add-permission \
  --function-name code-canvas-astro-lambda \
  --statement-id FunctionURLAllowPublicAccess \
  --action lambda:InvokeFunctionUrl \
  --principal "*" \
  --function-url-auth-type NONE \
  --region us-west-2
```

---

## 🧪 Testing Your Deployment

After deployment, test your Function URL:

```bash
# Get Function URL
FUNCTION_URL=$(aws lambda get-function-url-config \
  --function-name code-canvas-astro-lambda \
  --query 'FunctionUrl' \
  --output text \
  --region us-west-2)

echo "Function URL: $FUNCTION_URL"

# Test endpoint
curl $FUNCTION_URL

# Monitor logs in real-time
aws logs tail /aws/lambda/code-canvas-astro-lambda \
  --follow \
  --region us-west-2

# Check S3 database
aws s3 ls s3://code-canvas-astro-db/database/

# Download database to inspect locally
aws s3 cp s3://code-canvas-astro-db/database/taskManagement.db ./db-backup.db
```

---

## 🔄 Updating the Lambda Function

To update with a new Docker image:

```bash
# Update code
# ... make your changes ...

# Rebuild image
docker build --platform linux/amd64 \
  -t python-repl-container-lambda:v1.2 \
  -f Dockerfile.lambda .

# Tag and push
docker tag python-repl-container-lambda:v1.2 \
  415740581749.dkr.ecr.us-west-2.amazonaws.com/python-repl-container-lambda:v1.2

docker push 415740581749.dkr.ecr.us-west-2.amazonaws.com/python-repl-container-lambda:v1.2

# Update Lambda
aws lambda update-function-code \
  --function-name code-canvas-astro-lambda \
  --image-uri 415740581749.dkr.ecr.us-west-2.amazonaws.com/python-repl-container-lambda:v1.2 \
  --region us-west-2

# Wait for update to complete
aws lambda wait function-updated \
  --function-name code-canvas-astro-lambda \
  --region us-west-2
```

**Note**: The S3 database is **preserved** during updates - no data loss!

---

## 💰 Cost Analysis

### Lambda + S3 Costs

**Example**: 10,000 requests/month, 2GB memory, 5s average duration

| Service | Calculation | Cost/Month |
|---------|-------------|------------|
| **Lambda Requests** | 10,000 × $0.20/1M | $0.002 |
| **Lambda Duration** | 10,000 × 2GB × 5s × $0.0000166667 | $1.67 |
| **S3 Storage** | 1GB × $0.023 | $0.023 |
| **S3 Requests** | 10,000 PUT + 10,000 GET × $0.0004/1K | $0.008 |
| **ECR Storage** | 1GB × $0.10 | $0.10 |
| **TOTAL** | | **~$2-6/month** |

### Comparison with Alternatives

| Service | Monthly Cost | Persistent Storage | Setup Complexity |
|---------|--------------|-------------------|------------------|
| **Lambda + S3** | $2-6 | ✅ Yes (S3) | ✅ Simple |
| **App Runner** | $57 | ❌ No | ⚠️ Medium |
| **ECS + EFS** | $80-120 | ✅ Yes (EFS) | ❌ Complex |
| **EC2 + EBS** | $30-50 | ✅ Yes (EBS) | ⚠️ Medium |

**Lambda + S3 is the most cost-effective solution with true persistence!**

---

## 🗑️ Cleanup

To remove all resources:

```bash
# Delete Lambda function
aws lambda delete-function \
  --function-name code-canvas-astro-lambda \
  --region us-west-2

# Delete S3 bucket (including all objects)
aws s3 rm s3://code-canvas-astro-db --recursive
aws s3api delete-bucket \
  --bucket code-canvas-astro-db \
  --region us-west-2

# Delete ECR repository
aws ecr delete-repository \
  --repository-name python-repl-container-lambda \
  --force \
  --region us-west-2

# Delete IAM role
aws iam delete-role-policy \
  --role-name code-canvas-astro-lambda-role \
  --policy-name S3DatabaseAccessPolicy

aws iam detach-role-policy \
  --role-name code-canvas-astro-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam delete-role \
  --role-name code-canvas-astro-lambda-role
```

---

## ⚠️ Important Notes

### Database Persistence

✅ **TRUE Persistence with S3**:
- Database stored in S3 bucket
- Downloaded on Lambda cold start
- Uploaded after write operations
- Periodic sync for read operations
- Data survives Lambda redeployments
- Versioning enabled for backup/recovery

### Security Considerations

1. **Function URL Auth**: Set to NONE for demo (public access)
   - For production, consider API Gateway + Cognito
   - Or implement custom authentication in the app

2. **S3 Bucket Access**: Private bucket with IAM policy
   - Only Lambda has access
   - Encryption enabled at rest
   - Versioning enabled for recovery

3. **Credentials**: Never commit AWS credentials
   - Use `aws configure` for local development
   - Use IAM roles for production deployments
   - Use environment variables for CI/CD

### Performance Considerations

1. **Cold Starts**: First request takes 10-20 seconds
   - Downloads database from S3
   - Initializes Astro server
   - Subsequent requests are fast (~100-500ms)

2. **Warm Starts**: Instant response
   - Lambda container stays warm for ~15 minutes
   - Database already in /tmp
   - No S3 download needed

3. **Database Sync**:
   - Write operations: Immediate S3 sync
   - Read operations: Sync every 30 seconds
   - Shutdown: Final sync before termination

### Limitations

1. **Lambda Timeout**: Maximum 15 minutes (900 seconds)
   - Current configuration: 15 minutes
   - Sufficient for most web requests

2. **Lambda /tmp Storage**: Maximum 10 GB
   - Current configuration: 1 GB
   - Sufficient for SQLite database

3. **Concurrent Writes**: SQLite doesn't handle concurrent writes well
   - Consider using DynamoDB for high concurrency
   - Or implement database locking in application

---

## 📊 Monitoring & Logs

### CloudWatch Logs

View Lambda logs:

```bash
# Tail logs
aws logs tail /aws/lambda/code-canvas-astro-lambda \
  --follow \
  --region us-west-2

# Filter for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/code-canvas-astro-lambda \
  --filter-pattern "ERROR" \
  --region us-west-2

# View specific time range
aws logs filter-log-events \
  --log-group-name /aws/lambda/code-canvas-astro-lambda \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --region us-west-2
```

### Lambda Metrics

View function metrics:

```bash
# Get function configuration
aws lambda get-function-configuration \
  --function-name code-canvas-astro-lambda \
  --region us-west-2

# Get invocation metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=code-canvas-astro-lambda \
  --start-time $(date -u -d '1 hour ago' +%FT%TZ) \
  --end-time $(date -u +%FT%TZ) \
  --period 300 \
  --statistics Sum \
  --region us-west-2
```

### S3 Database Monitoring

```bash
# List database versions
aws s3api list-object-versions \
  --bucket code-canvas-astro-db \
  --prefix database/taskManagement.db

# Get database size
aws s3 ls s3://code-canvas-astro-db/database/taskManagement.db --human-readable

# Download database for inspection
aws s3 cp s3://code-canvas-astro-db/database/taskManagement.db ./local-backup.db

# Restore previous version (if needed)
aws s3api get-object \
  --bucket code-canvas-astro-db \
  --key database/taskManagement.db \
  --version-id <version-id> \
  restored-db.db
```

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] Configure AWS credentials securely (no hardcoded secrets)
- [ ] Review IAM permissions (principle of least privilege)
- [ ] Enable CloudWatch logging and monitoring
- [ ] Set up AWS CloudTrail for audit logging
- [ ] Consider API Gateway with authentication (instead of public Function URL)
- [ ] Enable AWS WAF for DDoS protection
- [ ] Set up AWS Secrets Manager for sensitive configuration
- [ ] Review S3 bucket policies and encryption
- [ ] Enable S3 versioning for database backup
- [ ] Set up CloudWatch alarms for errors and high costs
- [ ] Implement rate limiting in application
- [ ] Add authentication/authorization to application endpoints

---

## 📞 Support & Troubleshooting

### Common Issues

**Problem**: Lambda timeout errors
- **Solution**: Increase timeout (max 900s) or optimize application

**Problem**: S3 access denied
- **Solution**: Verify IAM role has S3 permissions

**Problem**: Cold start too slow
- **Solution**: Consider provisioned concurrency for production

**Problem**: Database not persisting
- **Solution**: Check CloudWatch logs for S3 sync errors

### Getting Help

1. **CloudWatch Logs**: Check for error messages
2. **IAM Permissions**: Verify execution role has correct policies
3. **S3 Bucket**: Ensure bucket exists and is accessible
4. **ECR Image**: Verify image pushed successfully
5. **Lambda Configuration**: Check environment variables

---

## 🎯 Summary

### What You Get

✅ **Infrastructure**:
- S3 bucket for persistent database storage
- Lambda function with container image
- Public Function URL (HTTPS)
- IAM roles with least privilege
- CloudWatch logging

✅ **Features**:
- True database persistence via S3
- Automatic S3 sync (writes immediate, reads periodic)
- Versioning enabled for backup/recovery
- Encryption at rest (S3 + Lambda)
- SUCCESS/FAIL messages for each deployment step

✅ **Cost Benefits**:
- 10x cheaper than App Runner (~$2-6 vs ~$57/month)
- Pay only for what you use
- No minimum charges
- Free tier eligible (first 12 months)

### Quick Start

```bash
# Deploy everything
python3 deploy_to_lambda.py

# Access your app at the returned Function URL
# Monitor logs: aws logs tail /aws/lambda/code-canvas-astro-lambda --follow
```

---

**Built with ❤️ using AWS Lambda, S3, Docker, and Astro**
