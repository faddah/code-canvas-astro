import { clerkSetup } from "@clerk/testing/playwright";
import * as fs from "node:fs";

/**
 * Playwright global setup — runs once before any tests.
 *
 * 1. Loads .env.test into process.env. Playwright's global setup runs in
 *    a plain Node context that does NOT pick up Astro/Vite's env loading,
 *    so we load the test env file ourselves via Node's built-in loader
 *    (requires Node ≥20.12 — verified v24.14.1 locally).
 * 2. If `.env.test` is present, loads it into process.env
 * 3. If `.env.test` is NOT present, say, if the tests are run on GitHub
 *    Actions with a secret env var, it loads that secret env var from
 *    GitHub Actions into process.env
 * 4. Validates the required test credentials exist, failing loudly if
 *    anything is missing rather than letting Clerk throw a cryptic 401
 *    later during sign-in.
 * 5. Calls clerkSetup() which fetches a testing token from Clerk's
 *    backend (using CLERK_SECRET_KEY) and caches it for later calls to
 *    setupClerkTestingToken(). This token is what bypasses Clerk's bot
 *    detection during automated sign-in.
 */
async function globalSetup() {
    if (fs.existsSync(".env.test")) {
        process.loadEnvFile(".env.test");
    }

    const required = [
        "PUBLIC_CLERK_PUBLISHABLE_KEY",
        "CLERK_SECRET_KEY",
        "E2E_CLERK_USER_USERNAME",
        "E2E_CLERK_USER_PASSWORD",
    ];
    for (const key of required) {
        if (!process.env[key]) {
        throw new Error(
            `[global-setup] Missing required env var: ${key}. ` +
            `Check .env.test locally, or GitHub Actions secrets in CI.`,
        );
        }
    }

    await clerkSetup({
        publishableKey: process.env.PUBLIC_CLERK_PUBLISHABLE_KEY,
        secretKey: process.env.CLERK_SECRET_KEY,
    });
}

export default globalSetup;
