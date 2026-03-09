#!/bin/bash
set -e

DISTRIBUTION_ID="E8UQ2BAGKYYM0"
API_DOMAIN="pvh7sgwr49.execute-api.us-west-2.amazonaws.com"

echo "Step 1: Fetching CloudFront distribution config..."
aws cloudfront get-distribution-config --id "$DISTRIBUTION_ID" > /tmp/cf-dist.json
DIST_ETAG=$(jq -r '.ETag' /tmp/cf-dist.json)

echo ""
echo "Step 2: Updating origin to use API Gateway..."
jq --arg domain "$API_DOMAIN" '
  .DistributionConfig |
  .Origins.Items[0].DomainName = $domain |
  .Origins.Items[0].CustomHeaders.Quantity = 0 |
  .Origins.Items[0].CustomHeaders.Items = []
' /tmp/cf-dist.json > /tmp/cf-dist-updated.json

aws cloudfront update-distribution \
  --id "$DISTRIBUTION_ID" \
  --distribution-config file:///tmp/cf-dist-updated.json \
  --if-match "$DIST_ETAG"

echo ""
echo "✓ CloudFront updated to use API Gateway"
echo ""
echo "⏳ Waiting for deployment (5-15 minutes)..."
echo ""
echo "Monitor status:"
echo "  aws cloudfront get-distribution --id $DISTRIBUTION_ID --query 'Distribution.Status'"
echo ""
echo "Test when deployed:"
echo "  curl -I https://pyrepl.dev"
