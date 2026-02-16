// CloudFront Function - used by AWS CloudFront, not called directly in code
// eslint-disable-next-line no-unused-vars
function handler(event) {
    const request = event.request;
    
    // Set the Host header to match the Lambda Function URL
    request.headers['host'] = {
        value: 'jb6uzlmmok5wxyr2nzdci3wdfi0rcush.lambda-url.us-west-2.on.aws',
    };
    
    return request;
}
