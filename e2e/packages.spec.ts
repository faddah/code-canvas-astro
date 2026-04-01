import { test, expect } from "@playwright/test";
import { mockStarterFilesAPI, waitForIDEShell } from "./helpers";

test.describe("API Routes - Packages", () => {
    test("GET /api/packages returns 401 for unauthenticated request", async ({
        request,
    }) => {
        const response = await request.get("/api/packages");
        expect(response.status()).toBe(401);
        const body = await response.json();
        expect(body.error).toBe("Unauthorized");
    });

    test("POST /api/packages/create returns 401 for unauthenticated request", async ({
        request,
    }) => {
        const response = await request.post("/api/packages/create", {
        data: { packageName: "numpy" },
        });
        expect(response.status()).toBe(401);
    });

    test("DELETE /api/packages/1 returns 401 for unauthenticated request", async ({
        request,
    }) => {
        const response = await request.delete("/api/packages/1");
        expect(response.status()).toBe(401);
    });
});

test.describe("Packages UI - Anonymous", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        await mockStarterFilesAPI(page);
        await page.goto("/");
        await waitForIDEShell(page);
    });

    test("Packages section is NOT visible for anonymous users", async ({ page }) => {
        // The Packages section should only appear for signed-in users
        const packagesHeader = page.locator("text=Packages").first();
        await expect(packagesHeader).not.toBeVisible();
    });
});