import { test, expect } from "@playwright/test";
import { blockPyodide } from "./helpers";

test.describe("IDE — 'Taking too long?' reload button", () => {
        test.setTimeout(45_000);

        test("shows reload button after loading for 10 seconds", async ({ page }) => {
            // Delay the starter-files response so isLoadingFiles stays true for > 10s
            await page.route("**/api/starter-files", async (route) => {
                await new Promise((resolve) => setTimeout(resolve, 35_000));
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify([]),
                });
            });
            await blockPyodide(page);
            await page.goto("/");

            // Initially the reload button should NOT be visible
            const reloadButton = page.locator(
                'button:has-text("Taking too long? Click to reload")',
            );
            await expect(reloadButton).not.toBeVisible({ timeout: 3_000 });

            // The loading spinner should be visible
            await expect(
                page.locator("text=Initializing Environment...").first(),
            ).toBeVisible({ timeout: 15_000 });

            // After ~10s the button should appear
            await expect(reloadButton).toBeVisible({ timeout: 15_000 });
        });

        test("reload button is not shown when files load quickly", async ({
            page,
        }) => {
            // Respond immediately with starter files
            await page.route("**/api/starter-files", (route) =>
                route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify([
                        {
                            id: 1,
                            name: "main.py",
                            content: 'print("fast")\n',
                            createdAt: "2025-01-01T00:00:00.000Z",
                        },
                    ]),
                }),
            );
            await blockPyodide(page);
            await page.goto("/");

            // Wait for IDE to load
            await expect(
                page.locator(".panel-header >> text=Console").first(),
            ).toBeVisible({ timeout: 60_000 });

            // The reload button should never appear
            await expect(
                page.locator('button:has-text("Taking too long? Click to reload")'),
            ).not.toBeVisible({ timeout: 3_000 });
        });
});
