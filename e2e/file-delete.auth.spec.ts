import { test, expect } from "./fixtures/authenticated";
import {
    blockPyodide,
    waitForIDEShell,
    waitForFiles,
    mockUserProfileAPI,
    mockUserFilesAPI,
    mockProjectsAPI,
    mockPackagesAPI,
    mockDeleteFileAPI,
} from "./helpers";

// All files are loose (no projectId) so they appear at top level without expanding
const LOOSE_FILES = [
    {
        id: 101,
        name: "app.py",
        content: '# file one\nprint("hello")\n',
        projectId: null,
        clerkId: "user_test123",
        createdAt: "2025-01-01T00:00:00.000Z",
    },
    {
        id: 102,
        name: "helpers.py",
        content: "# file two\ndef greet():\n    return 'hi'\n",
        projectId: null,
        clerkId: "user_test123",
        createdAt: "2025-01-01T00:00:00.000Z",
    },
    {
        id: 103,
        name: "solo.py",
        content: "# file three\nprint('solo')\n",
        projectId: null,
        clerkId: "user_test123",
        createdAt: "2025-01-02T00:00:00.000Z",
    },
    ];

    test.describe("File delete — two-step confirmation", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        await mockUserProfileAPI(page);
        await mockUserFilesAPI(page, LOOSE_FILES);
        await mockProjectsAPI(page, []);
        await mockPackagesAPI(page, []);
        await mockDeleteFileAPI(page);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);
        await waitForFiles(page);
    });

    test("trash icon appears on file hover when multiple files exist", async ({
        page,
    }) => {
        // Hover over the file row containing app.py
        const fileRow = page.locator("text=app.py").first().locator("..");
        await expect(fileRow).toBeVisible({ timeout: 10_000 });
        await fileRow.hover();

        // The Trash2 icon button should become visible on hover
        const trashButton = fileRow.locator("button:has(svg.lucide-trash-2)");
        await expect(trashButton).toBeVisible({ timeout: 5_000 });
    });

    test("clicking trash shows Confirm and X buttons", async ({ page }) => {
        const fileRow = page.locator("text=app.py").first().locator("..");
        await expect(fileRow).toBeVisible({ timeout: 10_000 });
        await fileRow.hover();

        // Click the trash icon
        const trashButton = fileRow.locator("button:has(svg.lucide-trash-2)");
        await trashButton.click();

        // Confirm button should appear with red styling
        const confirmButton = fileRow.locator("button", { hasText: "Confirm" });
        await expect(confirmButton).toBeVisible({ timeout: 5_000 });

        // X button should also be visible (the cancel button next to Confirm)
        const cancelX = fileRow.locator("button:has(svg.lucide-x)");
        await expect(cancelX).toBeVisible({ timeout: 5_000 });
    });

    test("clicking X cancels the delete and restores trash icon", async ({
        page,
    }) => {
        const fileRow = page.locator("text=app.py").first().locator("..");
        await expect(fileRow).toBeVisible({ timeout: 10_000 });
        await fileRow.hover();

        // Click trash to enter confirm state
        const trashButton = fileRow.locator("button:has(svg.lucide-trash-2)");
        await trashButton.click();

        // Click the X to cancel
        const cancelX = fileRow.locator("button:has(svg.lucide-x)");
        await cancelX.click();

        // Confirm button should disappear
        await expect(
            fileRow.locator("button", { hasText: "Confirm" }),
        ).not.toBeVisible({ timeout: 5_000 });

        // Trash icon should be back (visible on hover)
        await fileRow.hover();
        await expect(fileRow.locator("button:has(svg.lucide-trash-2)")).toBeVisible(
            { timeout: 5_000 },
        );
    });

    test("clicking Confirm calls DELETE API", async ({ page }) => {
        let deleteCalled = false;
        let deleteUrl = "";

        // Add a listener to capture the DELETE call
        page.on("request", (request) => {
            if (
                request.method() === "DELETE" &&
                request.url().includes("/api/user-files/")
            ) {
                deleteCalled = true;
                deleteUrl = request.url();
            }
        });

        const fileRow = page.locator("text=app.py").first().locator("..");
        await expect(fileRow).toBeVisible({ timeout: 10_000 });
        await fileRow.hover();

        // Click trash → then Confirm
        const trashButton = fileRow.locator("button:has(svg.lucide-trash-2)");
        await trashButton.click();

        const confirmButton = fileRow.locator("button", { hasText: "Confirm" });
        await confirmButton.click();

        // Wait a tick for the API call to fire
        await page.waitForTimeout(500);

        expect(deleteCalled).toBe(true);
        // File id 101 is app.py from LOOSE_FILES
        expect(deleteUrl).toContain("/api/user-files/101");
    });

    test("trash icon is hidden when only one file remains", async ({ page }) => {
        // Override the mock with only 1 file
        await page.unrouteAll();
        await mockUserProfileAPI(page);
        await mockUserFilesAPI(page, [LOOSE_FILES[0]]); // just app.py
        await mockProjectsAPI(page, []);
        await mockPackagesAPI(page, []);
        await mockDeleteFileAPI(page);
        await blockPyodide(page);

        await page.goto("/");
        await waitForIDEShell(page);
        await waitForFiles(page);

        // Hover over the only file
        const fileRow = page.locator("text=app.py").first().locator("..");
        await expect(fileRow).toBeVisible({ timeout: 10_000 });
        await fileRow.hover();

        // Trash icon should NOT appear (disabled prop causes Trash2Btn to return null)
        await expect(
            fileRow.locator("button:has(svg.lucide-trash-2)"),
        ).not.toBeVisible({ timeout: 3_000 });
    });
});
