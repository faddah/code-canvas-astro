#!/bin/bash
set -e

DISTRIBUTION_ID="E8UQ2BAGKYYM0"

echo "Step 1: Fetching CloudFront distribution config..."
aws cloudfront get-distribution-config --id "$DISTRIBUTION_ID" > /tmp/cf-dist.json
DIST_ETAG=$(jq -r '.ETag' /tmp/cf-dist.json)

echo ""
echo "Step 2: Updating to use AllViewerExceptHostHeader origin request policy..."
# Use AWS managed policy that forwards all headers EXCEPT Host
# Policy ID: b689b0a8-53d0-40ab-baf2-68738e2966ac (AllViewerExceptHostHeader)
jq '
  .DistributionConfig |
  .DefaultCacheBehavior.OriginRequestPolicyId = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
' /tmp/cf-dist.json > /tmp/cf-dist-updated.json

aws cloudfront update-distribution \
  --id "$DISTRIBUTION_ID" \
  --distribution-config file:///tmp/cf-dist-updated.json \
  --if-match "$DIST_ETAG"

echo ""
echo "✓ CloudFront updated to not forward Host header"
echo ""
echo "Step 3: Creating cache invalidation..."
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*"

echo ""
echo "⏳ Waiting for deployment (5-10 minutes)..."
echo ""
echo "Test when ready:"
echo "  curl -I https://pyrepl.dev"
