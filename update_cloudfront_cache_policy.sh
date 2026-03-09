#!/usr/bin/env bash
set -euo pipefail

# Step 1: Create a cache policy that disables caching for API routes
#         (Cookie is NOT allowed here — CloudFront reserves it for origin request policies)
aws cloudfront create-cache-policy --cache-policy-config '{
    "Name": "CodeCanvasNoCacheAPI",
    "MinTTL": 0,
    "MaxTTL": 0,
    "DefaultTTL": 0,
    "ParametersInCacheKeyAndForwardedToOrigin": {
        "EnableAcceptEncodingGzip": true,
        "HeadersConfig": {
            "HeaderBehavior": "whitelist",
            "Headers": {
                "Quantity": 2,
                "Items": [
                    "Authorization",
                    "Origin"
                ]
            }
        },
        "CookiesConfig": {
            "CookieBehavior": "none"
        },
        "QueryStringsConfig": {
            "QueryStringBehavior": "none"
        }
    }
}'

# Step 2: Create an origin request policy that forwards cookies to the origin
aws cloudfront create-origin-request-policy --origin-request-policy-config '{
    "Name": "CodeCanvasForwardCookies",
    "HeadersConfig": {
        "HeaderBehavior": "whitelist",
        "Headers": {
            "Quantity": 2,
            "Items": [
                "Authorization",
                "Origin"
            ]
        }
    },
    "CookiesConfig": {
        "CookieBehavior": "all"
    },
    "QueryStringsConfig": {
        "QueryStringBehavior": "all"
    }
}'

echo ""
echo "Done. Next steps:"
echo "1. Note the cache policy ID and origin request policy ID from the output above."
echo "2. Attach both to your CloudFront distribution's behavior (distribution E8UQ2BAGKYYM0)"
echo "   via the console or with 'aws cloudfront update-distribution'."
