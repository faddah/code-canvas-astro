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
                    ""Authorization",
                    "Cookie",
                    "Origin"
                ]
            }
        },
        "CookiesConfig": {
            "CookieBehavior": "all",
        },
        "QueryStringsConfig": {
            "QueryStringBehavior": "all"
        }
    }
}