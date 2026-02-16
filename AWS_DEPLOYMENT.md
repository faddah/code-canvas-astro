# AWS Deployment Instructions for pyrepl.dev

## Prerequisites

1. AWS CLI configured with credentials
2. AWS CDK CLI installed: `npm install -g aws-cdk`
3. Python 3.8+ installed

## Installation

```bash
# Install Python dependencies
pip install -r requirements-aws-deploy.txt

# Bootstrap CDK (first time only)
cdk bootstrap aws://ACCOUNT-ID/us-east-1
```

## Deployment Steps

### 1. Run the deployment script

```bash
python aws_route53_cloudfront_deploy.py
```

This will synthesize the CDK stack.

### 2. Deploy the stack

```bash
cdk deploy PyReplDevStack --require-approval never
```

### 3. Update Porkbun Nameservers

After deployment:

1. Go to AWS Console → Route 53 → Hosted Zones → pyrepl.dev
2. Copy the 4 NS (nameserver) records
3. Log in to Porkbun.com
4. Navigate to your domain settings for pyrepl.dev
5. Replace the existing nameservers with the AWS nameservers
6. Save changes

**Current Porkbun nameservers (to be replaced):**
- curitiba.ns.porkbun.com
- fortaleza.ns.porkbun.com
- maceio.ns.porkbun.com
- salvador.ns.porkbun.com

### 4. Wait for DNS Propagation

DNS propagation typically takes 15-30 minutes but can take up to 48 hours.

### 5. Verify Deployment

```bash
# Check DNS resolution
dig pyrepl.dev

# Test HTTPS access
curl -I https://pyrepl.dev
```

## What Gets Created

- **Route 53 Hosted Zone** for pyrepl.dev
- **ACM SSL Certificate** (auto-renewing) for pyrepl.dev and *.pyrepl.dev
- **CloudFront Distribution** pointing to your Lambda function
- **DNS A Records** for pyrepl.dev and www.pyrepl.dev

## Troubleshooting

### Certificate validation pending
- Wait 5-10 minutes for DNS validation records to propagate
- Check Route 53 for CNAME validation records

### CloudFront not accessible
- CloudFront deployment takes 15-30 minutes
- Check distribution status in AWS Console

### Domain not resolving
- Verify nameservers updated at Porkbun
- Check DNS propagation: `dig pyrepl.dev @8.8.8.8`

## Cleanup

To remove all resources:

```bash
cdk destroy PyReplDevStack
```

**Note:** Remember to revert Porkbun nameservers if you destroy the stack.
