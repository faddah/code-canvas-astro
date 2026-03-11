#!/usr/bin/env python3
"""
Cold Start Fix — S3 Static Assets for CloudFront
==================================================
This script sets up an S3 bucket to serve Astro's static build assets
(/_astro/*) directly through CloudFront, bypassing Lambda entirely.

WHY: When a new visitor hits pyrepl.dev, Lambda cold-starts to serve the
HTML. The browser then requests ~5-10 JS/CSS chunks simultaneously.
Without S3, every chunk goes through Lambda too — some get 503 during
cold start — React never hydrates — the loading spinner stays forever.

WITH this fix: CloudFront routes /_astro/* to S3 (instant, no Lambda),
so JS/CSS loads even while Lambda is still cold-starting.

Pipeline:
    1. Create S3 bucket (pyrepl-static-assets) with public access blocked
    2. Create CloudFront Origin Access Control (OAC)
    3. Attach S3 bucket policy granting CloudFront read-only access
    4. Add S3 origin + cache behavior to existing CloudFront distribution
    5. Sync dist/client/ to S3
    6. Invalidate CloudFront cache

Usage:
    python3 cold_start_fix.py

Requirements:
    pip install boto3 botocore
"""

import json
import os
import subprocess
import sys
import time

import boto3
from botocore.exceptions import ClientError, WaiterError

# ============================================================================
# CONFIGURATION — Must match your update_aws_deployment.py values
# ============================================================================

AWS_REGION = "us-west-2"
AWS_ACCOUNT = "415740581749"

# S3 bucket for static assets (will be created if it doesn't exist)
S3_BUCKET_NAME = "pyrepl-static-assets"

# Your existing CloudFront distribution
CLOUDFRONT_DISTRIBUTION_ID = "E8UQ2BAGKYYM0"

# The Origin Access Control name (identifies the OAC in AWS Console)
OAC_NAME = "pyrepl-s3-oac"

# Path to built client assets (relative to this script)
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DIST_CLIENT_DIR = os.path.join(PROJECT_ROOT, "dist", "client")


# ============================================================================
# ANSI COLORS (same style as update_aws_deployment.py)
# ============================================================================

class C:
    """ANSI escape code constants for colorized terminal output."""
    GREEN   = "\033[92m"
    CYAN    = "\033[96m"
    YELLOW  = "\033[93m"
    RED     = "\033[91m"
    BOLD    = "\033[1m"
    ENDC    = "\033[0m"


def info(msg: str) -> None:
    """Print an informational message with a cyan ℹ icon."""
    print(f"   {C.CYAN}ℹ{C.ENDC} {msg}")


def success(msg: str) -> None:
    """Print a success message with a green ✓ icon."""
    print(f"   {C.GREEN}✓{C.ENDC} {msg}")


def warn(msg: str) -> None:
    """Print a warning message with a yellow ⚠ icon."""
    print(f"   {C.YELLOW}⚠{C.ENDC} {msg}")


def fail(msg: str) -> None:
    """Print a failure message with a red ✗ icon."""
    print(f"   {C.RED}✗{C.ENDC} {msg}")


# ============================================================================
# STAGE 1 — Create S3 Bucket
# ============================================================================
#
# WHY we block all public access:
#   The bucket is NOT a public website. Only CloudFront can read from it,
#   via the Origin Access Control (OAC) we create in Stage 2.  This is
#   the AWS-recommended pattern — it keeps the bucket private while still
#   letting CloudFront serve the files to browsers.
#
# WHY LocationConstraint:
#   S3 requires you to specify the region when creating a bucket outside
#   of us-east-1.  If you omit it, the bucket lands in us-east-1 regardless
#   of what region your boto3 client is configured for.

def stage_1_create_s3_bucket(s3_client) -> bool:
    """Create the S3 bucket if it doesn't already exist."""
    print(f"\n{C.BOLD}STAGE 1: Create S3 bucket `{S3_BUCKET_NAME}`{C.ENDC}")

    try:
        # Check if bucket already exists
        s3_client.head_bucket(Bucket=S3_BUCKET_NAME)
        success(f"Bucket `{S3_BUCKET_NAME}` already exists")
        return True
    except ClientError as e:
        error_code = int(e.response["Error"]["Code"])
        if error_code == 404:
            info(f"Bucket `{S3_BUCKET_NAME}` not found — creating it now…")
        elif error_code == 403:
            fail(
                f"Bucket `{S3_BUCKET_NAME}` exists but you don't have access. "
                "Choose a different bucket name."
            )
            return False
        else:
            fail(f"Unexpected error checking bucket: {e}")
            return False

    # Create the bucket
    #
    # CreateBucketConfiguration with LocationConstraint is required for any
    # region other than us-east-1.  Without it, AWS silently creates the
    # bucket in us-east-1.
    try:
        s3_client.create_bucket(
            Bucket=S3_BUCKET_NAME,
            CreateBucketConfiguration={
                "LocationConstraint": AWS_REGION,
            },
        )
        info(f"Bucket `{S3_BUCKET_NAME}` created in {AWS_REGION}")
    except ClientError as e:
        fail(f"Failed to create bucket: {e}")
        return False

    # Block all public access — CloudFront will use OAC, not public URLs
    #
    # This sets four flags that together ensure no S3 object in this bucket
    # can ever be made publicly accessible via S3 URLs.  All access goes
    # through CloudFront's Origin Access Control instead.
    try:
        s3_client.put_public_access_block(
            Bucket=S3_BUCKET_NAME,
            PublicAccessBlockConfiguration={
                "BlockPublicAcls": True,
                "IgnorePublicAcls": True,
                "BlockPublicPolicy": True,
                "RestrictPublicBuckets": True,
            },
        )
        success(f"Bucket `{S3_BUCKET_NAME}` created with public access blocked")
        return True
    except ClientError as e:
        fail(f"Failed to set public access block: {e}")
        return False


# ============================================================================
# STAGE 2 — Create CloudFront Origin Access Control (OAC)
# ============================================================================
#
# WHAT IS AN OAC?
#   Origin Access Control is the modern replacement for Origin Access
#   Identity (OAI).  It tells CloudFront: "When you fetch from this S3
#   bucket, sign the request with SigV4 so S3 knows it's really you."
#
#   Without an OAC, CloudFront would need the bucket to be public (bad)
#   or use the older OAI mechanism (deprecated).
#
# SigningProtocol: "sigv4" — the standard AWS request-signing protocol.
# SigningBehavior: "always" — sign every request (not just some).
# OriginAccessControlOriginType: "s3" — this OAC is for an S3 origin.

def stage_2_create_oac(cf_client) -> str | None:
    """Create a CloudFront Origin Access Control for S3, return its ID."""
    print(f"\n{C.BOLD}STAGE 2: Create CloudFront Origin Access Control{C.ENDC}")

    # Check if OAC already exists by listing them and matching by name
    #
    # CloudFront doesn't have a "get OAC by name" API, so we list all
    # OACs and look for one with our name.  This makes the script
    # idempotent — safe to run multiple times.
    try:
        paginator = cf_client.get_paginator(
            "list_origin_access_controls"
        )
        for page in paginator.paginate():
            for item in page["OriginAccessControlList"].get("Items", []):
                if item["Name"] == OAC_NAME:
                    oac_id = item["Id"]
                    success(f"OAC `{OAC_NAME}` already exists (ID: {oac_id})")
                    return oac_id
    except ClientError as e:
        fail(f"Error listing OACs: {e}")
        return None

    # Create new OAC
    try:
        resp = cf_client.create_origin_access_control(
            OriginAccessControlConfig={
                "Name": OAC_NAME,
                "Description": "OAC for pyrepl.dev static assets in S3",
                "SigningProtocol": "sigv4",
                "SigningBehavior": "always",
                "OriginAccessControlOriginType": "s3",
            }
        )
        oac_id = resp["OriginAccessControl"]["Id"]
        success(f"OAC `{OAC_NAME}` created (ID: {oac_id})")
        return oac_id
    except ClientError as e:
        fail(f"Failed to create OAC: {e}")
        return None


# ============================================================================
# STAGE 3 — Attach S3 Bucket Policy
# ============================================================================
#
# This policy grants CloudFront (via the OAC) permission to GetObject
# from every key in the bucket.  The Condition block restricts it to
# only YOUR CloudFront distribution — no other distribution can read
# from this bucket.
#
# "Service": "cloudfront.amazonaws.com" — the principal is CloudFront
# "aws:SourceArn" — must match your specific distribution's ARN

def stage_3_attach_bucket_policy(s3_client) -> bool:
    """Attach a bucket policy that allows CloudFront OAC to read objects."""
    print(f"\n{C.BOLD}STAGE 3: Attach S3 bucket policy for CloudFront access{C.ENDC}")

    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AllowCloudFrontServicePrincipalReadOnly",
                "Effect": "Allow",
                "Principal": {
                    "Service": "cloudfront.amazonaws.com"
                },
                "Action": "s3:GetObject",
                "Resource": f"arn:aws:s3:::{S3_BUCKET_NAME}/*",
                "Condition": {
                    "StringEquals": {
                        "AWS:SourceArn": (
                            f"arn:aws:cloudfront::{AWS_ACCOUNT}"
                            f":distribution/{CLOUDFRONT_DISTRIBUTION_ID}"
                        )
                    }
                },
            }
        ],
    }

    try:
        s3_client.put_bucket_policy(
            Bucket=S3_BUCKET_NAME,
            Policy=json.dumps(policy),
        )
        success("Bucket policy attached — CloudFront can read objects")
        return True
    except ClientError as e:
        fail(f"Failed to attach bucket policy: {e}")
        return False


# ============================================================================
# STAGE 4 — Update CloudFront Distribution
# ============================================================================
#
# This is the most complex stage. We need to:
#   1. GET the current distribution config (including its ETag)
#   2. Add a new Origin pointing to our S3 bucket
#   3. Add a new CacheBehavior for /_astro/* that routes to that origin
#   4. PUT the updated config back (with the ETag for optimistic locking)
#
# WHY ETag?
#   CloudFront uses optimistic concurrency control.  You must send back
#   the ETag you received from GetDistributionConfig.  If someone else
#   modified the distribution between your GET and PUT, the ETag won't
#   match and AWS rejects the update.  This prevents race conditions.
#
# Cache behavior ordering:
#   CloudFront evaluates CacheBehaviors in order — first match wins.
#   We insert our /_astro/* behavior at the FRONT of the list so it
#   takes priority over the default behavior (which routes to Lambda).

def stage_4_update_cloudfront(cf_client, oac_id: str) -> bool:
    """Add S3 origin and /_astro/* cache behavior to CloudFront distribution."""
    print(f"\n{C.BOLD}STAGE 4: Update CloudFront distribution with S3 origin{C.ENDC}")

    # The S3 origin domain name follows this pattern for all S3 buckets:
    s3_origin_domain = f"{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com"
    # This ID is how we reference the origin in cache behaviors:
    s3_origin_id = "S3-pyrepl-static-assets"

    # Step 4a: Get the current distribution config
    #
    # We need the full config AND the ETag.  The ETag is a version
    # identifier — we must pass it back in the update call to prove
    # we're modifying the version we think we are.
    try:
        info("Fetching current CloudFront distribution config…")
        resp = cf_client.get_distribution_config(Id=CLOUDFRONT_DISTRIBUTION_ID)
        config = resp["DistributionConfig"]
        etag = resp["ETag"]
        info(f"Got config (ETag: {etag[:12]}…)")
    except ClientError as e:
        fail(f"Failed to get distribution config: {e}")
        return False

    # Step 4b: Check if S3 origin already exists
    #
    # If we've run this script before, the origin is already there.
    # Skip adding it again to make the script idempotent.
    origins = config["Origins"]
    origin_exists = any(
        o["Id"] == s3_origin_id for o in origins["Items"]
    )

    if origin_exists:
        info(f"Origin `{s3_origin_id}` already exists — skipping")
    else:
        # Add the S3 origin to the distribution
        #
        # Key fields:
        #   DomainName — the S3 bucket's regional endpoint
        #   Id — a unique identifier we choose (used in cache behaviors)
        #   OriginAccessControlId — links to our OAC from Stage 2
        #   S3OriginConfig.OriginAccessIdentity — empty string because
        #     we're using OAC (not the older OAI mechanism)
        new_origin = {
            "DomainName": s3_origin_domain,
            "Id": s3_origin_id,
            "OriginPath": "",
            "CustomHeaders": {"Quantity": 0},
            "S3OriginConfig": {
                "OriginAccessIdentity": ""  # empty = using OAC, not OAI
            },
            "OriginAccessControlId": oac_id,
            "OriginShield": {"Enabled": False},
            "ConnectionAttempts": 3,
            "ConnectionTimeout": 10,
        }
        origins["Items"].append(new_origin)
        origins["Quantity"] = len(origins["Items"])
        info(f"Added S3 origin `{s3_origin_id}`")

    # Step 4c: Check if /_astro/* cache behavior already exists
    cache_behaviors = config.get("CacheBehaviors", {"Quantity": 0, "Items": []})
    if "Items" not in cache_behaviors:
        cache_behaviors["Items"] = []

    behavior_exists = any(
        cb["PathPattern"] == "/_astro/*"
        for cb in cache_behaviors["Items"]
    )

    if behavior_exists:
        info("Cache behavior for `/_astro/*` already exists — skipping")
    else:
        # Add cache behavior for /_astro/* → S3
        #
        # Key design decisions:
        #
        # ViewerProtocolPolicy: "redirect-to-https"
        #   Force HTTPS — never serve assets over plain HTTP.
        #
        # CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6"
        #   This is AWS's managed "CachingOptimized" policy.  It caches
        #   based on the full URL and uses gzip/brotli compression.
        #   Perfect for immutable build assets.
        #
        # Compress: True
        #   CloudFront will compress responses with gzip or brotli,
        #   reducing transfer size for JS/CSS files.
        #
        # WHY no TTL overrides?
        #   Astro's build output includes content hashes in filenames
        #   (e.g., chunk-IFEBM3MJ.DBJFYiTh.js).  We set Cache-Control:
        #   immutable when uploading to S3, so CloudFront and browsers
        #   cache them effectively forever.  New builds produce new
        #   filenames, so stale cache is never a problem.
        new_behavior = {
            "PathPattern": "/_astro/*",
            "TargetOriginId": s3_origin_id,
            "ViewerProtocolPolicy": "redirect-to-https",
            "AllowedMethods": {
                "Quantity": 2,
                "Items": ["GET", "HEAD"],
                "CachedMethods": {
                    "Quantity": 2,
                    "Items": ["GET", "HEAD"],
                },
            },
            "Compress": True,
            "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
            "SmoothStreaming": False,
            "FieldLevelEncryptionId": "",
        }
        # Insert at the front so it takes priority
        cache_behaviors["Items"].insert(0, new_behavior)
        cache_behaviors["Quantity"] = len(cache_behaviors["Items"])
        config["CacheBehaviors"] = cache_behaviors
        info("Added cache behavior: `/_astro/*` → S3")

    # Step 4d: Push the updated config back to CloudFront
    if not origin_exists or not behavior_exists:
        try:
            info("Updating CloudFront distribution (this takes 2-5 minutes to deploy)…")
            cf_client.update_distribution(
                Id=CLOUDFRONT_DISTRIBUTION_ID,
                DistributionConfig=config,
                IfMatch=etag,  # optimistic lock — must match what we fetched
            )
            success("CloudFront distribution updated")
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "PreconditionFailed":
                fail(
                    "Distribution was modified by someone else. "
                    "Run this script again."
                )
            else:
                fail(f"Failed to update distribution: {e}")
            return False
    else:
        success("CloudFront distribution already configured — no update needed")

    return True


# ============================================================================
# STAGE 5 — Sync dist/client/ to S3
# ============================================================================
#
# We use the AWS CLI's `s3 sync` command because it:
#   - Only uploads changed files (compares ETags/sizes)
#   - Handles hundreds of files efficiently with parallel uploads
#   - Supports --cache-control for setting headers on all objects
#   - Supports --delete to remove old build artifacts
#
# WHY not boto3 for the upload?
#   boto3's put_object works one file at a time.  For a full dist/client/
#   directory with dozens of files, `aws s3 sync` is much faster and
#   handles content-type detection automatically.

def stage_5_sync_to_s3() -> bool:
    """Upload dist/client/ contents to S3 with immutable caching headers."""
    print(f"\n{C.BOLD}STAGE 5: Sync static assets to S3{C.ENDC}")

    if not os.path.isdir(DIST_CLIENT_DIR):
        fail(
            f"dist/client/ not found at {DIST_CLIENT_DIR}\n"
            "   Run `npm run build` first to generate the build output."
        )
        return False

    # Count files to upload
    file_count = sum(
        len(files)
        for _, _, files in os.walk(DIST_CLIENT_DIR)
    )
    info(f"Found {file_count} files in dist/client/")

    # aws s3 sync — upload only changed files
    #
    # --cache-control "public, max-age=31536000, immutable"
    #   Tells browsers and CloudFront to cache these files for 1 year.
    #   This is safe because Astro includes content hashes in filenames —
    #   when code changes, filenames change, so old cached copies are
    #   never served for new code.
    #
    # --delete
    #   Removes files from S3 that no longer exist in dist/client/.
    #   Keeps the bucket clean after each build.
    cmd = [
        "aws", "s3", "sync",
        DIST_CLIENT_DIR,
        f"s3://{S3_BUCKET_NAME}/",
        "--region", AWS_REGION,
        "--cache-control", "public, max-age=31536000, immutable",
        "--delete",
    ]

    info(f"Running: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            text=True,
        )
        if result.stdout.strip():
            for line in result.stdout.strip().split("\n")[:10]:
                info(f"  {line}")
            remaining = result.stdout.strip().count("\n") - 10
            if remaining > 0:
                info(f"  … and {remaining} more files")
        success(f"Synced {file_count} files to s3://{S3_BUCKET_NAME}/")
        return True
    except FileNotFoundError:
        fail(
            "AWS CLI not found. Install it:\n"
            "   brew install awscli   (macOS)\n"
            "   pip install awscli    (any platform)"
        )
        return False
    except subprocess.CalledProcessError as e:
        fail(f"S3 sync failed: {e.stderr}")
        return False


# ============================================================================
# STAGE 6 — Invalidate CloudFront Cache
# ============================================================================
#
# After uploading new files to S3 and changing the distribution config,
# we invalidate CloudFront's cache so it fetches fresh content.
# We only invalidate /_astro/* (our static assets), not /* (everything).

def stage_6_invalidate_cloudfront(cf_client) -> bool:
    """Invalidate CloudFront cache for /_astro/* paths."""
    print(f"\n{C.BOLD}STAGE 6: Invalidate CloudFront cache for /_astro/*{C.ENDC}")

    caller_ref = f"cold-start-fix-{int(time.time())}"

    try:
        resp = cf_client.create_invalidation(
            DistributionId=CLOUDFRONT_DISTRIBUTION_ID,
            InvalidationBatch={
                "Paths": {"Quantity": 1, "Items": ["/_astro/*"]},
                "CallerReference": caller_ref,
            },
        )
        inv_id = resp["Invalidation"]["Id"]
        info(f"Invalidation created (ID: {inv_id})")

        # Wait for completion (usually 1-3 minutes)
        info("Waiting for invalidation to complete…")
        waiter = cf_client.get_waiter("invalidation_completed")
        try:
            waiter.wait(
                DistributionId=CLOUDFRONT_DISTRIBUTION_ID,
                Id=inv_id,
                WaiterConfig={"Delay": 15, "MaxAttempts": 30},
            )
            success("CloudFront cache invalidated for /_astro/*")
        except :
            warn(
                f"Invalidation {inv_id} still in progress — "
                "it will complete in the background"
            )
        return True
    except ClientError as e:
        fail(f"Failed to create invalidation: {e}")
        return False


# ============================================================================
# MAIN
# ============================================================================

def main() -> None:
    """Run the 6-stage cold-start fix pipeline."""
    print(f"\n{C.CYAN}{C.BOLD}{'=' * 70}")
    print("   Cold Start Fix — S3 Static Assets for CloudFront")
    print(f"{'=' * 70}{C.ENDC}")
    print(f"\n   Bucket     : {S3_BUCKET_NAME}")
    print(f"   CloudFront : {CLOUDFRONT_DISTRIBUTION_ID}")
    print(f"   Region     : {AWS_REGION}")
    print(f"   Assets dir : {DIST_CLIENT_DIR}\n")

    # Create boto3 clients
    s3_client = boto3.client("s3", region_name=AWS_REGION)
    cf_client = boto3.client("cloudfront")

    # Run stages sequentially — each depends on the previous

    # Stage 1: Create S3 bucket
    if not stage_1_create_s3_bucket(s3_client):
        fail("Pipeline aborted at Stage 1")
        sys.exit(1)

    # Stage 2: Create OAC (returns the OAC ID we need for later stages)
    oac_id = stage_2_create_oac(cf_client)
    if not oac_id:
        fail("Pipeline aborted at Stage 2")
        sys.exit(1)

    # Stage 3: Attach bucket policy
    if not stage_3_attach_bucket_policy(s3_client):
        fail("Pipeline aborted at Stage 3")
        sys.exit(1)

    # Stage 4: Update CloudFront distribution
    if not stage_4_update_cloudfront(cf_client, oac_id):
        fail("Pipeline aborted at Stage 4")
        sys.exit(1)

    # Stage 5: Sync files to S3
    if not stage_5_sync_to_s3():
        fail("Pipeline aborted at Stage 5")
        sys.exit(1)

    # Stage 6: Invalidate CloudFront cache
    if not stage_6_invalidate_cloudfront(cf_client):
        fail("Pipeline aborted at Stage 6")
        sys.exit(1)

    # Success summary
    print(f"\n{C.BOLD}{'=' * 70}{C.ENDC}")
    print(f"{C.GREEN}{C.BOLD}  COLD START FIX COMPLETE — ALL 6 STAGES PASSED{C.ENDC}\n")
    print(f"  {C.GREEN}S3 Bucket   : {S3_BUCKET_NAME}{C.ENDC}")
    print(f"  {C.GREEN}OAC ID      : {oac_id}{C.ENDC}")
    print(f"  {C.GREEN}CloudFront  : {CLOUDFRONT_DISTRIBUTION_ID} updated{C.ENDC}")
    print(f"  {C.GREEN}Static path : /_astro/* → S3 (bypasses Lambda){C.ENDC}")
    print()
    print(f"  {C.CYAN}Next steps:{C.ENDC}")
    print(f"  1. Wait 2-5 minutes for CloudFront distribution to deploy")
    print(f"  2. Test in a fresh incognito window: https://pyrepl.dev")
    print(f"  3. Check that JS/CSS loads instantly (no 503s)")
    print()
    print(f"  {C.CYAN}On future deploys:{C.ENDC}")
    print(f"  Your update_aws_deployment.py will now auto-sync dist/client/")
    print(f"  to S3 as part of the deployment pipeline.")
    print(f"{C.BOLD}{'=' * 70}{C.ENDC}\n")


if __name__ == "__main__":
    main()
