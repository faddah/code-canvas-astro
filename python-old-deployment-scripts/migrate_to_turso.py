#!/usr/bin/env python3
"""
migrate_to_turso.py — Verify Turso migration and update Lambda environment variables.

Steps:
    1. Download taskManagement.db from S3 (if not already local)
    2. Compare row counts and data between local SQLite and Turso
    3. Update Lambda environment variables to use Turso
    4. Verify the Lambda configuration update
"""

import os
import sys
import sqlite3
import subprocess

import boto3
import botocore

# ─── Constants ───────────────────────────────────────────────────────

AWS_REGION = "us-west-2"
LAMBDA_FUNCTION_NAME = "code-canvas-astro-lambda"
S3_BUCKET_NAME = "code-canvas-astro-db"
S3_DB_KEY = "database/taskManagement.db"
LOCAL_DB_PATH = "./taskManagement.db"

TABLES = ["starter_files", "user_profiles", "user_files"]

# ─── Step 1: Download DB from S3 ────────────────────────────────────

def download_db_from_s3():
    """Download taskManagement.db from S3 if not already present locally."""
    if os.path.exists(LOCAL_DB_PATH):
        print(f"✓ Local database already exists at {LOCAL_DB_PATH}")
        return

    print(f"Downloading {S3_DB_KEY} from s3://{S3_BUCKET_NAME}...")
    s3 = boto3.client("s3", region_name=AWS_REGION)
    try:
        s3.download_file(S3_BUCKET_NAME, S3_DB_KEY, LOCAL_DB_PATH)
        print(f"✓ Downloaded to {LOCAL_DB_PATH}")
    except botocore.exceptions.ClientError as e:
        print(f"✗ Failed to download from S3: {e}")
        sys.exit(1)

# ─── Step 2: Verification helpers ───────────────────────────────────

def get_sqlite_rows(table):
    """Read all rows from a table in the local SQLite database."""
    conn = sqlite3.connect(LOCAL_DB_PATH)
    cursor = conn.execute(f"SELECT * FROM {table} ORDER BY id")
    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()
    conn.close()
    return columns, rows

def get_turso_count(table):
    """Get row count from a table in the Turso database via CLI."""
    result = subprocess.run(
        [
            "turso",
            "db",
            "shell",
            "pyrepl-db",
            f"SELECT COUNT(*) FROM {table}"
        ],
        capture_output=True,
        text=True,
        check=False
    )
    if result.returncode != 0:
        print(f"  ✗ Turso query failed for {table}: {result.stderr}")
        sys.exit(1)

    # Output format is a table with header + value, e.g.:
    # COUNT(*)
    # 5
    lines = [l.strip() for l in result.stdout.strip().splitlines() if l.strip()]
    # The last line should be the count
    try:
        return int(lines[-1])
    except (ValueError, IndexError):
        print(f"  ✗ Could not parse Turso count for {table}: {result.stdout}")
        sys.exit(1)

# ─── Step 3: Add the Verification Function────────────────────────────

def verify_migration():
    """Compare row counts between local SQLite and Turso."""
    print("\n─── Verifying migration ───")
    all_match = True

    for table in TABLES:
        print(f"\nTable: {table}")

        _, sqlite_rows = get_sqlite_rows(table)
        sqlite_count = len(sqlite_rows)
        turso_count = get_turso_count(table)

        if sqlite_count != turso_count:
            print(f"  ✗ Row count mismatch: SQLite={sqlite_count}, Turso={turso_count}")
            all_match = False
        else:
            print(f"  ✓ Row count matches: {sqlite_count}")

    return all_match


# ─── Step 4: Update Lambda environment variables ────────────────────

def update_lambda_env_vars():
    """Replace S3/SQLite env vars with Turso credentials on the Lambda function."""
    print("\n─── Updating Lambda environment variables ───")

    turso_url = os.environ.get("TURSO_DATABASE_URL", "")
    turso_token = os.environ.get("TURSO_AUTH_TOKEN", "")

    if not turso_url or not turso_token:
        print("✗ TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in your environment.")
        print("  Export them or add them to your .env file, then run:")
        print("  export $(grep -v '^#' .env | xargs)")
        sys.exit(1)

    print(f"  Turso URL: {turso_url}")
    print(f"  Turso token: {turso_token[:8]}...{turso_token[-4:]}")

    lambda_client = boto3.client("lambda", region_name=AWS_REGION)

    # Get current config to preserve non-DB env vars
    print("  Fetching current Lambda configuration...")
    current_config = lambda_client.get_function_configuration(
        FunctionName=LAMBDA_FUNCTION_NAME
    )
    current_vars = current_config.get("Environment", {}).get("Variables", {})

    # Remove old S3/SQLite vars
    for old_key in ["S3_BUCKET_NAME", "S3_DB_KEY", "DATABASE_URL"]:
        current_vars.pop(old_key, None)

    # Add Turso vars
    current_vars["TURSO_DATABASE_URL"] = turso_url
    current_vars["TURSO_AUTH_TOKEN"] = turso_token

    print("  Updating Lambda environment variables...")
    lambda_client.update_function_configuration(
        FunctionName=LAMBDA_FUNCTION_NAME,
        Environment={"Variables": current_vars},
    )

    print("✓ Lambda environment variables updated.")
    print("  Removed: S3_BUCKET_NAME, S3_DB_KEY, DATABASE_URL")
    print("  Added:   TURSO_DATABASE_URL, TURSO_AUTH_TOKEN")

# ─── Step 4: Verify Lambda configuration ────────────────────────────

def verify_lambda_config():
    """Confirm the Lambda function has the correct Turso env vars."""
    print("\n─── Verifying Lambda configuration ───")

    lambda_client = boto3.client("lambda", region_name=AWS_REGION)
    config = lambda_client.get_function_configuration(
        FunctionName=LAMBDA_FUNCTION_NAME
    )
    env_vars = config.get("Environment", {}).get("Variables", {})

    # Check old vars are gone
    old_vars_present = [k for k in ["S3_BUCKET_NAME", "S3_DB_KEY", "DATABASE_URL"]
                        if k in env_vars]
    if old_vars_present:
        print(f"  ✗ Old vars still present: {old_vars_present}")
        return False

    print("  ✓ Old S3/SQLite vars removed")

    # Check new vars exist
    if "TURSO_DATABASE_URL" not in env_vars:
        print("  ✗ TURSO_DATABASE_URL not found")
        return False
    if "TURSO_AUTH_TOKEN" not in env_vars:
        print("  ✗ TURSO_AUTH_TOKEN not found")
        return False

    print(f"  ✓ TURSO_DATABASE_URL = {env_vars['TURSO_DATABASE_URL']}")
    print(f"  ✓ TURSO_AUTH_TOKEN = {env_vars['TURSO_AUTH_TOKEN'][:8]}...")
    print("\n✓ Lambda configuration verified.")
    return True

# ─── Main ────────────────────────────────────────────────────────────

def main():
    """Orchestrate the full Turso migration: download DB, verify data, update Lambda."""
    print("=" * 60)
    print("  Turso Migration — Verify & Update Lambda")
    print("=" * 60)

    # Step 1: Ensure local DB exists
    download_db_from_s3()

    # Step 2: Verify data matches
    if not verify_migration():
        print("\n✗ Migration verification FAILED. Aborting Lambda update.")
        sys.exit(1)

    print("\n✓ Migration verification PASSED.")

    # Step 3: Update Lambda env vars
    response = input("\nProceed with Lambda env var update? [Y/n]: ").strip().lower()
    if response not in ("", "y", "yes"):
        print("Aborted. No changes made to Lambda.")
        sys.exit(0)

    update_lambda_env_vars()

    # Step 4: Verify Lambda config
    if not verify_lambda_config():
        print("\n✗ Lambda verification FAILED. Check the AWS console.")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("  Migration complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
