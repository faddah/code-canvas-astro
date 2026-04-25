import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";

setup("authenticate with Clerk", async ({ page }, testInfo) => {
    setup.setTimeout(90_000);
    const storageState = `e2e/.auth/${testInfo.project.name}.json`;
    fs.mkdirSync(path.dirname(storageState), { recursive: true });

    // ─── Browser diagnostics ──────────────────────────────────────────
    page.on("console", (msg) => {
        const type = msg.type();
        if (type === "error" || type === "warning") {
        console.log(`[browser ${type}] ${msg.text()}`);
        }
    });
    page.on("pageerror", (err) => {
        console.log(`[browser pageerror] ${err.message}`);
    });

    // ─── Navigate and wait for Clerk SDK ──────────────────────────────
    console.log("[setup] step 1: injecting testing token");
    await setupClerkTestingToken({ page });

    console.log("[setup] step 2: navigating to /");
    await page.goto("/");

    console.log("[setup] step 3: waiting for clerk.loaded");
    try {
        await page.waitForFunction(
            () => (window as unknown as { Clerk?: { loaded?: boolean } }).Clerk?.loaded === true,
            undefined,
            { timeout: 60_000 },
        );
    } catch (err) {
        const diag = await page.evaluate(() => {
            const c = (window as unknown as { Clerk?: { loaded?: boolean; client?: unknown; version?: string } }).Clerk;
            return {
                defined: typeof c !== "undefined",
                loaded: c?.loaded ?? null,
                hasClient: !!c?.client,
                version: c?.version ?? null,
            };
        });
        throw new Error(
            `[setup] Clerk.loaded never became true. Diagnostic: ${JSON.stringify(diag)}. Original: ${(err as Error).message}`,
        );
    }

    // ─── Create a sign-in ticket via Clerk Backend API (Node side) ────
    // We call fetch directly instead of using @clerk/testing's helper
    // because we need complete control over the flow and full error
    // visibility. Also the built-in helper may skip the setActive step.
    console.log("[setup] step 4: fetching user by email");
    const email = process.env.E2E_CLERK_USER_USERNAME!;
    const secretKey = process.env.CLERK_SECRET_KEY!;

    const userListRes = await fetch(
        `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
        { headers: { Authorization: `Bearer ${secretKey}` } },
    );
    if (!userListRes.ok) {
        throw new Error(
        `[setup] users lookup failed: ${userListRes.status} ${await userListRes.text()}`,
        );
    }
    const users = (await userListRes.json()) as Array<{ id: string }>;
    if (!users.length) {
        throw new Error(`[setup] no Clerk user found with email ${email}`);
    }
    const userId = users[0].id;
    console.log(`[setup] found user: ${userId}`);

    console.log("[setup] step 5: creating sign-in ticket");
    const tokenRes = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
        method: "POST",
        headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: userId, expires_in_seconds: 300 }),
    });
    if (!tokenRes.ok) {
        throw new Error(
        `[setup] sign-in token creation failed: ${tokenRes.status} ${await tokenRes.text()}`,
        );
    }
    const { token } = (await tokenRes.json()) as { token: string };
    console.log("[setup] ticket created successfully");

    // ─── Consume the ticket in the browser + activate the session ─────
    console.log("[setup] step 6: calling signIn.create + setActive in browser");
    const signInResult = await page.evaluate(async (ticket: string) => {
        try {
        const clerk = (window as any).Clerk;
        if (!clerk) return { ok: false, reason: "window.Clerk is undefined" };
        if (!clerk.client)
            return { ok: false, reason: "window.Clerk.client is undefined" };

        const signIn = await clerk.client.signIn.create({
            strategy: "ticket",
            ticket,
        });

        const createdSessionId = signIn?.createdSessionId;
        const status = signIn?.status;

        if (!createdSessionId) {
            return {
            ok: false,
            reason: "signIn.create returned without createdSessionId",
            status,
            firstFactorVerification: signIn?.firstFactorVerification,
            secondFactorVerification: signIn?.secondFactorVerification,
            supportedFirstFactors: signIn?.supportedFirstFactors,
            };
        }

        // THE critical step — activate the session on the client.
        await clerk.setActive({ session: createdSessionId });

        return {
            ok: true,
            status,
            createdSessionId,
            currentSessionId: clerk.session?.id ?? null,
            currentUserId: clerk.user?.id ?? null,
        };
        } catch (err: any) {
        return {
            ok: false,
            reason: "threw exception",
            error: err?.message ?? String(err),
            errors: err?.errors ?? null,
        };
        }
    }, token);

    console.log("[setup] signIn result:", JSON.stringify(signInResult, null, 2));

    if (!signInResult.ok) {
        throw new Error(
        `[setup] sign-in failed in browser: ${JSON.stringify(signInResult)}`,
        );
    }

    // ─── Final sanity check ───────────────────────────────────────────
    const finalState = await page.evaluate(() => {
        const c = (window as any).Clerk;
        return {
        loaded: c?.loaded,
        hasSession: !!c?.session,
        sessionId: c?.session?.id ?? null,
        userId: c?.user?.id ?? null,
        };
    });
    console.log("[setup] final state:", JSON.stringify(finalState));

    if (!finalState.hasSession) {
        throw new Error("[setup] setActive completed but session still null");
    }

    // ─── Persist ─────────────────────────────────────────────────────
    console.log("[setup] step 7: persisting storageState");
    await page.context().storageState({ path: storageState });
    console.log("[setup] done ✓");
});
