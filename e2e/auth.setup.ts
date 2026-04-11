import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Path to the persisted signed-in browser context, relative to the
 * project root (where playwright.config.ts lives). Test projects load
 * this file via `use.storageState` and start already-authenticated.
 */
export const STORAGE_STATE = "e2e/.auth/user.json";

setup("authenticate with Clerk", async ({ page }) => {
    // Playwright's storageState({ path }) does NOT create parent directories,
    // so ensure e2e/.auth exists before we try to write into it.
    fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });

    // Inject Clerk's testing token (fetched by clerkSetup() in global-setup)
    // as a query param. This is the signal that tells Clerk's bot detection
    // "this is an authorized automated client, let it through".
    await setupClerkTestingToken({ page });

    // Navigate to the app so window.Clerk hydrates. clerk.signIn() below
    // calls into the Clerk JS SDK on the page, so the SDK must be loaded
    // before we call it.
    await page.goto("/");

    // Programmatic sign-in — no sign-in UI touched, no form fills, no
    // network flake from iframe rendering. clerk.signIn() calls the Clerk
    // client SDK directly and awaits a successful session.
    await clerk.signIn({
        page,
        signInParams: {
            strategy: "password",
            identifier: process.env.E2E_CLERK_USER_USERNAME!,
            password: process.env.E2E_CLERK_USER_PASSWORD!,
        },
    });

    // Sanity check: confirm Clerk reports an active session before we
    // persist state. Without this, we risk snapshotting the context
  // BEFORE the session cookie is actually set.
    await page.waitForFunction(
        () => {
            const c = (window as any).Clerk;
            return c?.loaded && !!c?.session;
        },
        { timeout: 15_000 },
    );

    // Persist cookies + localStorage to disk.
    await page.context().storageState({ path: STORAGE_STATE });
});
