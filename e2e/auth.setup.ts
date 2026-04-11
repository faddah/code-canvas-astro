import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";

export const STORAGE_STATE = "e2e/.auth/user.json";

setup("authenticate with Clerk", async ({ page }) => {
    setup.setTimeout(120_000);
    fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });

    // ─── Verbose browser-side diagnostics ───────────────────────────
    page.on("console", (msg) => {
        const type = msg.type();
        if (type === "error" || type === "warning") {
        console.log(`[browser ${type}] ${msg.text()}`);
        }
    });
    page.on("pageerror", (err) => {
        console.log(`[browser pageerror] ${err.message}`);
    });
    page.on("requestfailed", (req) => {
        console.log(
        `[req failed] ${req.method()} ${req.url()} → ${req.failure()?.errorText}`,
        );
    });

    console.log("[setup] step 1: injecting testing token");
    await setupClerkTestingToken({ page });

    console.log("[setup] step 2: navigating to /");
    await page.goto("/");

    console.log("[setup] step 3: waiting for clerk.loaded");
    await clerk.loaded({ page });

    const before = await page.evaluate(() => {
        const c = (window as any).Clerk;
        return {
        loaded: !!c?.loaded,
        hasSession: !!c?.session,
        userId: c?.user?.id ?? null,
        };
    });
    console.log("[setup] state BEFORE signIn:", JSON.stringify(before));

    console.log("[setup] step 4: calling clerk.signIn (email ticket strategy)");
    await clerk.signIn({
        page,
        signInParams: {
            strategy: "password",
            identifier: process.env.E2E_CLERK_USER_USERNAME!,
            password: process.env.E2E_CLERK_USER_PASSWORD!,
        },
    });

    const after = await page.evaluate(() => {
        const c = (window as any).Clerk;
        return {
        loaded: !!c?.loaded,
        hasSession: !!c?.session,
        userId: c?.user?.id ?? null,
        sessionId: c?.session?.id ?? null,
        };
    });
    console.log("[setup] state AFTER signIn (no reload):", JSON.stringify(after));

    const cookies = await page.context().cookies();
    const cookieSummary = cookies
        .map((c) => `${c.name}@${c.domain}`)
        .sort()
        .join(", ");
    console.log("[setup] cookies after signIn:", cookieSummary || "(none)");

    // ─── Hard-fail with a clear message if signIn didn't actually work ───
    if (!after.hasSession) {
        throw new Error(
        "[setup] clerk.signIn returned but window.Clerk.session is null.\n" +
            "Likely causes:\n" +
            "  (a) Wrong credentials in .env.test\n" +
            "  (b) Test user not in this Clerk instance (created in a different app)\n" +
            "  (c) Clerk key mismatch: dev server reads .env, test runner reads .env.test\n" +
            "  (d) Clerk email verification pending on the test user",
        );
    }

    console.log("[setup] step 5: persisting storageState");
    await page.context().storageState({ path: STORAGE_STATE });
    console.log("[setup] done");
});
