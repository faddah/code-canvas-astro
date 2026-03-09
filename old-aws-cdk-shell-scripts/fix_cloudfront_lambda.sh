#!/bin/bash
# Fix CloudFront to properly forward Host header to Lambda Function URL

DISTRIBUTION_ID="E8UQ2BAGKYYM0"
LAMBDA_DOMAIN="jb6uzlmmok5wxyr2nzdci3wdfi0rcush.lambda-url.us-west-2.on.aws"

echo "Fetching current CloudFront configuration..."
aws cloudfront get-distribution-config --id $DISTRIBUTION_ID > /tmp/cf-config.json

# Extract ETag
ETAG=$(jq -r '.ETag' /tmp/cf-config.json)
echo "Current ETag: $ETAG"

# Update the configuration to add Host header
jq --arg host "$LAMBDA_DOMAIN" '
  .DistributionConfig |
  .Origins.Items[0].CustomHeaders.Items += [{
    "HeaderName": "Host",
    "HeaderValue": $host
  }] |
  .Origins.Items[0].CustomHeaders.Quantity += 1
' /tmp/cf-config.json > /tmp/cf-config-updated.json

echo "Updating CloudFront distribution..."
aws cloudfront update-distribution \
  --id $DISTRIBUTION_ID \
  --distribution-config file:///tmp/cf-config-updated.json \
  --if-match "$ETAG"

echo ""
echo "✓ CloudFront updated successfully!"
echo "⏳ Waiting for deployment (this takes 5-15 minutes)..."
echo ""
echo "Check status with:"
echo "  aws cloudfront get-distribution --id $DISTRIBUTION_ID --query 'Distribution.Status'"
echo ""
echo "Test when Status shows 'Deployed':"
echo "  curl -I https://pyrepl.dev"
