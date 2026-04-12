import { test, expect } from "./fixtures/authenticated";
import {
    blockPyodide,
    dismissViteOverlay,
    waitForIDEShell,
    mockUserProfileAPI,
    mockProjectsAPI,
    mockPackagesAPI,
    MOCK_USER_FILES,
} from "./helpers";

test.describe("Explorer — error and retry state", () => {
    test.setTimeout(60_000);

    test("shows error message and Retry button when files API fails", async ({
        page,
    }) => {
        await mockUserProfileAPI(page);
        // Return 500 for user-files to trigger error state
        await page.route("**/api/user-files", (route, request) => {
        if (request.method() === "GET") {
            return route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Internal Server Error" }),
            });
        }
        return route.continue();
        });
        await mockProjectsAPI(page, []);
        await mockPackagesAPI(page, []);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);

        // "Could not load files" error message should appear
        await expect(page.locator("text=Could not load files").first()).toBeVisible(
        { timeout: 15_000 },
        );

        // Retry button should be visible
        const retryButton = page.locator('button:has-text("Retry")');
        await expect(retryButton).toBeVisible({ timeout: 5_000 });
    });

    test("clicking Retry re-fetches files and recovers from error", async ({
        page,
    }) => {
        await mockUserProfileAPI(page);
        // Fail ALL user-files requests initially
        await page.route("**/api/user-files", (route, request) => {
            if (request.method() === "GET") {
                return route.fulfill({
                    status: 500,
                    contentType: "application/json",
                    body: JSON.stringify({ error: "Internal Server Error" }),
                });
            }
            return route.continue();
        });
        await mockProjectsAPI(page, []);
        await mockPackagesAPI(page, []);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);

        // Wait for error state (after React Query exhausts all 5 retries)
        await expect(
            page.locator("text=Could not load files").first(),
        ).toBeVisible({ timeout: 45_000 });

        // Now swap the route to return real data before clicking Retry
        await page.unroute("**/api/user-files");
        await page.route("**/api/user-files", (route, request) => {
            if (request.method() === "GET") {
                return route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify(MOCK_USER_FILES),
                });
            }
            return route.continue();
        });

        // Click Retry
        const retryButton = page.locator('button:has-text("Retry")');
        await dismissViteOverlay(page);
        await retryButton.click({ force: true });

        // After retry, files should appear and error should disappear
        await expect(
            page.locator(".truncate.flex-1", { hasText: "solo.py" }).first(),
        ).toBeVisible({ timeout: 15_000 });

        await expect(
            page.locator("text=Could not load files"),
        ).not.toBeVisible({ timeout: 5_000 });
    });
});
