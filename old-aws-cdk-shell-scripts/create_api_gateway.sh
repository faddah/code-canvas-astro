#!/bin/bash
set -e

LAMBDA_NAME="code-canvas-astro-lambda"
LAMBDA_ARN="arn:aws:lambda:us-west-2:415740581749:function:code-canvas-astro-lambda"
API_NAME="pyrepl-api"
REGION="us-west-2"

echo "Step 1: Creating API Gateway HTTP API..."
API_ID=$(aws apigatewayv2 create-api \
  --name "$API_NAME" \
  --protocol-type HTTP \
  --target "$LAMBDA_ARN" \
  --region "$REGION" \
  --query 'ApiId' \
  --output text 2>/dev/null || aws apigatewayv2 get-apis --region "$REGION" --query "Items[?Name=='$API_NAME'].ApiId" --output text)

echo "API ID: $API_ID"

echo ""
echo "Step 2: Granting API Gateway permission to invoke Lambda..."
aws lambda add-permission \
  --function-name "$LAMBDA_NAME" \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:415740581749:$API_ID/*/*" \
  --region "$REGION" 2>/dev/null || echo "Permission may already exist"

echo ""
echo "Step 3: Creating integration..."
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --api-id "$API_ID" \
  --integration-type AWS_PROXY \
  --integration-uri "$LAMBDA_ARN" \
  --payload-format-version 2.0 \
  --region "$REGION" \
  --query 'IntegrationId' \
  --output text 2>/dev/null || aws apigatewayv2 get-integrations --api-id "$API_ID" --region "$REGION" --query 'Items[0].IntegrationId' --output text)

echo "Integration ID: $INTEGRATION_ID"

echo ""
echo "Step 4: Creating route for all paths..."
aws apigatewayv2 create-route \
  --api-id "$API_ID" \
  --route-key '$default' \
  --target "integrations/$INTEGRATION_ID" \
  --region "$REGION" 2>/dev/null || echo "Route may already exist"

echo ""
echo "Step 5: Creating $default stage..."
aws apigatewayv2 create-stage \
  --api-id "$API_ID" \
  --stage-name '$default' \
  --auto-deploy \
  --region "$REGION" 2>/dev/null || echo "Stage may already exist"

echo ""
echo "Step 6: Getting API Gateway endpoint..."
API_ENDPOINT=$(aws apigatewayv2 get-api --api-id "$API_ID" --region "$REGION" --query 'ApiEndpoint' --output text)
echo "API Gateway Endpoint: $API_ENDPOINT"

echo ""
echo "✓ API Gateway created successfully!"
echo ""
echo "Test the API Gateway:"
echo "  curl -I $API_ENDPOINT"
echo ""
echo "Next: Update CloudFront origin to use this API Gateway endpoint"
echo "  Domain: ${API_ENDPOINT#https://}"
