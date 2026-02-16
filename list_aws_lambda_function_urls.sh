for fn in $(aws lambda list-functions --region us-west-2 --query 'Functions[*].FunctionName' --output text); do
  url=$(aws lambda get-function-url-config --function-name "$fn" --region us-west-2 2>/dev/null | grep -o '"FunctionUrl": *"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$url" ]; then
        echo "$fn: $url"
    fi
done