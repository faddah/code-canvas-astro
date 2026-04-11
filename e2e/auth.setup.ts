import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Path to the persisted signed-in browser context, relative to the
 * project root. Test projects load this file via `use.storageState`
 * and start already-authenticated.
 */
export const STORAGE_STATE = "e2e/.auth/user.json";

setup("authenticate with Clerk", async ({ page }) => {
    // Dev-server cold start + Monaco assets + Clerk API calls routinely
    // exceed Playwright's 30s default on the first run. 2 minutes gives
    // us comfortable headroom, especially on Firefox/Webkit.
    setup.setTimeout(120_000);

    // storageState({ path }) does NOT create parent dirs. Do it ourselves.
    fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });

    // Pipe any browser-side errors out to the Playwright report. Without
    // this, a crash inside Clerk's SDK shows up as an opaque "timed out"
    // which wastes a lot of debugging time.
    page.on("console", (msg) => {
        if (msg.type() === "error") {
        console.log(`[browser console.error] ${msg.text()}`);
        }
    });
    page.on("pageerror", (err) => {
        console.log(`[browser pageerror] ${err.message}`);
    });

    // Inject Clerk's testing token as a query param BEFORE navigation so
    // Clerk's bot detection sees it on the first request.
    await setupClerkTestingToken({ page });

    // Land on the app. clerk.loaded() below will wait for the SDK.
    await page.goto("/");

    // Official Clerk helper: waits until window.Clerk.loaded === true.
    // Eliminates the race between page DOMContentLoaded and the Clerk JS
    // SDK finishing its own initialization.
    await clerk.loaded({ page });

    // Programmatic sign-in via Clerk's client SDK.
    await clerk.signIn({
        page,
        signInParams: {
        strategy: "password",
        identifier: process.env.E2E_CLERK_USER_USERNAME!,
        password: process.env.E2E_CLERK_USER_PASSWORD!,
        },
    });

    // Reload so the session cookie attaches to the document request and
    // Astro's server middleware sees the authenticated state. Without this
    // reload, the persisted storageState can miss server-side cookies that
    // are only set on document responses, not XHRs.
    await page.reload();

    // Belt-and-suspenders: confirm window.Clerk reports an active session
    // after the reload before we snapshot state. Generous timeout because
    // Clerk rehydrates from cookies on every navigation.
    await page.waitForFunction(
        () => {
        const c = (window as any).Clerk;
        return c?.loaded && !!c?.session;
        },
        { timeout: 30_000 },
    );

    // Persist cookies + localStorage to disk.
    await page.context().storageState({ path: STORAGE_STATE });
});
