import { test, expect } from "@playwright/test";
import { blockPyodide, mockStarterFilesAPI, waitForIDEShell } from "./helpers";

test.describe("Responsive layout", () => {
    test.setTimeout(60_000);

    test("Explorer is hidden on small viewports", async ({ browser }) => {
        // Create a context with a mobile-sized viewport
        const context = await browser.newContext({
            viewport: { width: 375, height: 667 },
        });
        const page = await context.newPage();

        await mockStarterFilesAPI(page);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);

        // Explorer pane should not be visible on small screens
        const explorer = page.locator("text=EXPLORER").first();
        await expect(explorer).not.toBeVisible({ timeout: 5_000 });

        // Console should still be visible
        await expect(
            page.locator(".panel-header >> text=Console").first(),
        ).toBeVisible({ timeout: 5_000 });

        await context.close();
    });

    test("Explorer is visible on desktop viewports", async ({ browser }) => {
        // Create a context with a desktop-sized viewport
        const context = await browser.newContext({
            viewport: { width: 1280, height: 720 },
        });
        const page = await context.newPage();

        await mockStarterFilesAPI(page);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);

        // Explorer pane should be visible on desktop
        const explorer = page.locator("text=EXPLORER").first();
        await expect(explorer).toBeVisible({ timeout: 10_000 });

        await context.close();
    });
});
