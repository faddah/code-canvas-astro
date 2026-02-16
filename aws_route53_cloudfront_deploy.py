#!/usr/bin/env python3
"""
AWS CDK deployment script for pyrepl.dev domain with CloudFront and Lambda
"""
import os
import sys
import time
import requests
from aws_cdk import (
    App, Stack, Environment,
    aws_route53 as route53,
    aws_route53_targets as targets,
    aws_certificatemanager as acm,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
)
from constructs import Construct
import boto3
from botocore.exceptions import ClientError


class PyReplDevStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        domain_name = "pyrepl.dev"
        lambda_url = "https://jb6uzlmmok5wxyr2nzdci3wdfi0rcush.lambda-url.us-west-2.on.aws"
        lambda_domain = "jb6uzlmmok5wxyr2nzdci3wdfi0rcush.lambda-url.us-west-2.on.aws"
        
        # Step 1: Create Route 53 Hosted Zone
        print(f"\n[STEP 1] Creating Route 53 Hosted Zone for {domain_name}...")
        try:
            hosted_zone = route53.PublicHostedZone(
                self, "PyReplDevHostedZone",
                zone_name=domain_name,
                comment="Hosted zone for Python REPL IDE"
            )
            print(f"✓ SUCCESS: Hosted Zone created for {domain_name}")
            print(f"  Note: Update Porkbun nameservers to AWS Route 53 nameservers shown in AWS Console")
        except Exception as e:
            print(f"✗ FAIL: Could not create Hosted Zone - {str(e)}")
            raise
        
        # Step 2: Request SSL Certificate from ACM
        print(f"\n[STEP 2] Requesting SSL Certificate from ACM for {domain_name}...")
        try:
            certificate = acm.Certificate(
                self, "PyReplDevCertificate",
                domain_name=domain_name,
                subject_alternative_names=[f"*.{domain_name}"],
                validation=acm.CertificateValidation.from_dns(hosted_zone)
            )
            print(f"✓ SUCCESS: SSL Certificate requested (auto-renewing)")
            print(f"  Certificate will be validated via DNS automatically")
        except Exception as e:
            print(f"✗ FAIL: Could not request certificate - {str(e)}")
            raise
        
        # Step 3: Create CloudFront Distribution
        print(f"\n[STEP 3] Creating CloudFront Distribution...")
        try:
            distribution = cloudfront.Distribution(
                self, "PyReplDevDistribution",
                default_behavior=cloudfront.BehaviorOptions(
                    origin=origins.HttpOrigin(
                        lambda_domain,
                        protocol_policy=cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
                        custom_headers={"X-Forwarded-Host": domain_name}
                    ),
                    viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL,
                    cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
                    origin_request_policy=cloudfront.OriginRequestPolicy.ALL_VIEWER,
                ),
                domain_names=[domain_name, f"www.{domain_name}"],
                certificate=certificate,
                minimum_protocol_version=cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
                http_version=cloudfront.HttpVersion.HTTP2_AND_3,
            )
            print(f"✓ SUCCESS: CloudFront Distribution created")
        except Exception as e:
            print(f"✗ FAIL: Could not create CloudFront Distribution - {str(e)}")
            raise
        
        # Step 4: Create Route 53 A Records
        print(f"\n[STEP 4] Creating Route 53 DNS records...")
        try:
            route53.ARecord(
                self, "PyReplDevARecord",
                zone=hosted_zone,
                target=route53.RecordTarget.from_alias(
                    targets.CloudFrontTarget(distribution)
                ),
                record_name=domain_name
            )
            
            route53.ARecord(
                self, "PyReplDevWwwARecord",
                zone=hosted_zone,
                target=route53.RecordTarget.from_alias(
                    targets.CloudFrontTarget(distribution)
                ),
                record_name=f"www.{domain_name}"
            )
            print(f"✓ SUCCESS: DNS A records created for {domain_name} and www.{domain_name}")
        except Exception as e:
            print(f"✗ FAIL: Could not create DNS records - {str(e)}")
            raise


def verify_deployment(domain: str, max_retries: int = 5, delay: int = 30):
    """Verify the domain is accessible via HTTPS"""
    print(f"\n[STEP 5] Verifying deployment at https://{domain}...")
    print(f"  Note: DNS propagation and CloudFront deployment may take 10-30 minutes")
    
    for attempt in range(1, max_retries + 1):
        try:
            print(f"  Attempt {attempt}/{max_retries}...")
            response = requests.get(f"https://{domain}", timeout=10, allow_redirects=True)
            if response.status_code == 200:
                print(f"✓ SUCCESS: https://{domain} is accessible (Status: {response.status_code})")
                return True
            else:
                print(f"  Status: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"  Connection attempt failed: {str(e)}")
        
        if attempt < max_retries:
            print(f"  Waiting {delay} seconds before retry...")
            time.sleep(delay)
    
    print(f"✗ FAIL: Could not verify https://{domain} after {max_retries} attempts")
    print(f"  This may be due to DNS propagation delay. Please verify manually in 15-30 minutes.")
    return False


def print_nameserver_instructions():
    """Print instructions for updating Porkbun nameservers"""
    print("\n" + "="*80)
    print("IMPORTANT: MANUAL STEP REQUIRED")
    print("="*80)
    print("\nAfter deployment completes, you MUST update your Porkbun nameservers:")
    print("\n1. Log in to Porkbun.com")
    print("2. Go to your domain management for pyrepl.dev")
    print("3. Find the AWS Route 53 nameservers in the AWS Console:")
    print("   - Go to Route 53 > Hosted Zones > pyrepl.dev")
    print("   - Copy the 4 NS record values")
    print("4. Replace Porkbun's nameservers with the AWS nameservers")
    print("\nCurrent Porkbun nameservers (to be replaced):")
    print("  - curitiba.ns.porkbun.com")
    print("  - fortaleza.ns.porkbun.com")
    print("  - maceio.ns.porkbun.com")
    print("  - salvador.ns.porkbun.com")
    print("\n5. DNS propagation can take 24-48 hours")
    print("="*80 + "\n")


def main():
    """Main deployment function"""
    print("\n" + "="*80)
    print("AWS CDK Deployment: pyrepl.dev with CloudFront and Lambda")
    print("="*80)
    
    # Check AWS credentials
    try:
        boto3.client('sts').get_caller_identity()
        print("✓ AWS credentials verified")
    except ClientError as e:
        print(f"✗ FAIL: AWS credentials not configured - {str(e)}")
        sys.exit(1)
    
    # Get AWS account and region
    account = os.environ.get("CDK_DEFAULT_ACCOUNT") or boto3.client('sts').get_caller_identity()["Account"]
    region = "us-east-1"  # ACM certificates for CloudFront must be in us-east-1
    
    print(f"  Account: {account}")
    print(f"  Region: {region} (required for CloudFront certificates)")
    
    # Create CDK app and stack
    app = App()
    PyReplDevStack(
        app, "PyReplDevStack",
        env=Environment(account=account, region=region),
        description="CloudFront distribution with Route 53 for pyrepl.dev Lambda function"
    )
    
    # Synthesize and deploy
    print("\n[DEPLOYING] Running CDK synthesis and deployment...")
    try:
        app.synth()
        print("✓ SUCCESS: CDK stack synthesized")
    except Exception as e:
        print(f"✗ FAIL: CDK synthesis failed - {str(e)}")
        sys.exit(1)
    
    print("\n" + "="*80)
    print("DEPLOYMENT INITIATED")
    print("="*80)
    print("\nTo complete deployment, run:")
    print("  cdk deploy PyReplDevStack")
    print("\nOr to auto-approve:")
    print("  cdk deploy PyReplDevStack --require-approval never")
    
    print_nameserver_instructions()
    
    # Note: Actual verification should happen after manual CDK deploy
    print("\nAfter running 'cdk deploy' and updating nameservers, test with:")
    print("  curl -I https://pyrepl.dev")


if __name__ == "__main__":
    main()
