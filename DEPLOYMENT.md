# AWS Lambda Deployment Guide

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
pip install -r deployment-requirements.txt
```

---

## 🚀 Deployment Steps

### Quick Deploy (All-in-One)
```bash
python3 deploy_lambda.py
```

This script will:
1. ✅ Create ECR repository `python-repl-container-lambda`
2. ✅ Build Docker image from your Dockerfile
3. ✅ Push image to ECR with tag `v1.0`
4. ✅ Create IAM execution role for Lambda
5. ✅ Create Lambda function `lambda-python-repl`
6. ✅ Create Function URL with CORS enabled (Auth: NONE)
7. ✅ Print deployment summary

---

## 📦 What Gets Created

### ECR Repository
- **Name**: `python-repl-container-lambda`
- **Tag**: `v1.0`
- **Region**: `us-west-2`

### Lambda Function
- **Name**: `lambda-python-repl`
- **Type**: Container Image
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Runtime**: Node.js (via container)

### Function URL
- **Auth Type**: NONE (public access)
- **CORS**: Enabled for all origins

---

## 🔧 Manual Deployment (Step-by-Step)

If you prefer manual control:

### 1. Create ECR Repository
```bash
aws ecr create-repository \
  --repository-name python-repl-container-lambda \
  --region us-west-2
```

### 2. Build & Push Docker Image
```bash
# Login to ECR
aws ecr get-login-password --region us-west-2 | \
  docker login --username AWS --password-stdin \
  415740581749.dkr.ecr.us-west-2.amazonaws.com

# Build image
docker build -t python-repl-container-lambda:v1.0 .

# Tag for ECR
docker tag python-repl-container-lambda:v1.0 \
  415740581749.dkr.ecr.us-west-2.amazonaws.com/python-repl-container-lambda:v1.0

# Push to ECR
docker push 415740581749.dkr.ecr.us-west-2.amazonaws.com/python-repl-container-lambda:v1.0
```

### 3. Create Lambda Function
```bash
aws lambda create-function \
  --function-name lambda-python-repl \
  --package-type Image \
  --code ImageUri=415740581749.dkr.ecr.us-west-2.amazonaws.com/python-repl-container-lambda:v1.0 \
  --role arn:aws:iam::415740581749:role/lambda-python-repl-role \
  --timeout 30 \
  --memory-size 512 \
  --region us-west-2
```

### 4. Create Function URL
```bash
aws lambda create-function-url-config \
  --function-name lambda-python-repl \
  --auth-type NONE \
  --cors AllowOrigins="*",AllowMethods="*",AllowHeaders="*" \
  --region us-west-2
```

---

## 🧪 Testing

After deployment, test your Function URL:

```bash
curl https://your-function-url.lambda-url.us-west-2.on.aws/
```

---

## 🔄 Updating the Lambda Function

To update with a new Docker image:

```bash
# Build new image
docker build -t python-repl-container-lambda:v1.1 .

# Tag and push
docker tag python-repl-container-lambda:v1.1 \
  415740581749.dkr.ecr.us-west-2.amazonaws.com/python-repl-container-lambda:v1.1
docker push 415740581749.dkr.ecr.us-west-2.amazonaws.com/python-repl-container-lambda:v1.1

# Update Lambda
aws lambda update-function-code \
  --function-name lambda-python-repl \
  --image-uri 415740581749.dkr.ecr.us-west-2.amazonaws.com/python-repl-container-lambda:v1.1
```

---

## 🗑️ Cleanup

To remove all resources:

```bash
# Delete Lambda function
aws lambda delete-function --function-name lambda-python-repl

# Delete ECR repository
aws ecr delete-repository --repository-name python-repl-container-lambda --force

# Delete IAM role
aws iam detach-role-policy \
  --role-name lambda-python-repl-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam delete-role --role-name lambda-python-repl-role
```

---

## ⚠️ Important Notes

1. **Credentials Security**: The exposed credentials in your message should be rotated immediately
2. **Function URL Auth**: Set to NONE means public access - consider adding authentication for production
3. **CORS**: Currently allows all origins (*) - restrict in production
4. **Costs**: Lambda and ECR incur costs - monitor your AWS billing
5. **Docker Context**: Ensure your Dockerfile is Lambda-compatible

---

## 📞 Support

For issues or questions:
- Check AWS CloudWatch Logs for Lambda errors
- Review ECR repository for image issues
- Verify IAM permissions for the execution role

---

## 🔐 Security Checklist

- [ ] Rotate exposed AWS credentials
- [ ] Review IAM permissions (principle of least privilege)
- [ ] Enable CloudWatch logging
- [ ] Set up AWS CloudTrail for audit logging
- [ ] Consider VPC configuration for Lambda
- [ ] Implement API Gateway with authentication (instead of public Function URL)
- [ ] Enable AWS WAF for DDoS protection
- [ ] Set up AWS Secrets Manager for sensitive data
