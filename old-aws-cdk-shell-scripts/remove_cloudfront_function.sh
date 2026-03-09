#!/bin/bash
set -e

DISTRIBUTION_ID="E8UQ2BAGKYYM0"

echo "Step 1: Fetching CloudFront distribution config..."
aws cloudfront get-distribution-config --id "$DISTRIBUTION_ID" > /tmp/cf-dist.json
DIST_ETAG=$(jq -r '.ETag' /tmp/cf-dist.json)

echo ""
echo "Step 2: Removing CloudFront Function association..."
jq '
  .DistributionConfig |
  .DefaultCacheBehavior.FunctionAssociations = {
    "Quantity": 0
  }
' /tmp/cf-dist.json > /tmp/cf-dist-updated.json

aws cloudfront update-distribution \
  --id "$DISTRIBUTION_ID" \
  --distribution-config file:///tmp/cf-dist-updated.json \
  --if-match "$DIST_ETAG"

echo ""
echo "✓ CloudFront Function removed"
echo ""
echo "⏳ Waiting for deployment (5-15 minutes)..."
echo ""
echo "Monitor status:"
echo "  aws cloudfront get-distribution --id $DISTRIBUTION_ID --query 'Distribution.Status'"
