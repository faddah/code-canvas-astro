#!/bin/bash
set -e

DISTRIBUTION_ID="E8UQ2BAGKYYM0"
FUNCTION_NAME="pyrepl-host-rewrite"

echo "Step 1: Creating CloudFront Function..."
aws cloudfront create-function \
  --name "$FUNCTION_NAME" \
  --function-config Comment="Rewrite Host header for Lambda Function URL",Runtime="cloudfront-js-2.0" \
  --function-code fileb://cloudfront-function-host-rewrite.js \
  --region us-east-1 2>/dev/null || echo "Function may already exist, continuing..."

echo ""
echo "Step 2: Publishing CloudFront Function..."
ETAG=$(aws cloudfront describe-function --name "$FUNCTION_NAME" --query 'ETag' --output text --region us-east-1)
aws cloudfront publish-function --name "$FUNCTION_NAME" --if-match "$ETAG" --region us-east-1

echo ""
echo "Step 3: Getting function ARN..."
FUNCTION_ARN=$(aws cloudfront describe-function --name "$FUNCTION_NAME" --query 'FunctionSummary.FunctionMetadata.FunctionARN' --output text --region us-east-1)
echo "Function ARN: $FUNCTION_ARN"

echo ""
echo "Step 4: Fetching CloudFront distribution config..."
aws cloudfront get-distribution-config --id "$DISTRIBUTION_ID" > /tmp/cf-dist.json
DIST_ETAG=$(jq -r '.ETag' /tmp/cf-dist.json)

echo ""
echo "Step 5: Updating distribution to attach function..."
jq --arg arn "$FUNCTION_ARN" '
  .DistributionConfig |
  .DefaultCacheBehavior.FunctionAssociations = {
    "Quantity": 1,
    "Items": [{
      "FunctionARN": $arn,
      "EventType": "viewer-request"
    }]
  }
' /tmp/cf-dist.json > /tmp/cf-dist-updated.json

aws cloudfront update-distribution \
  --id "$DISTRIBUTION_ID" \
  --distribution-config file:///tmp/cf-dist-updated.json \
  --if-match "$DIST_ETAG"

echo ""
echo "✓ SUCCESS! CloudFront Function deployed and attached"
echo ""
echo "⏳ CloudFront is now deploying (takes 5-15 minutes)"
echo ""
echo "Monitor deployment:"
echo "  aws cloudfront get-distribution --id $DISTRIBUTION_ID --query 'Distribution.Status'"
echo ""
echo "Test when Status = 'Deployed':"
echo "  curl -I https://pyrepl.dev"
