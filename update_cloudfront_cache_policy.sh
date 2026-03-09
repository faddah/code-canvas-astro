# Create a cache policy that forwards cookies and doesn't cache API routes
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
                "Quantity": 3,
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