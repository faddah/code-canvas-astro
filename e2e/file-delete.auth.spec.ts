import { test, expect } from "./fixtures/authenticated";
import {
    blockPyodide,
    dismissViteOverlay,
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
        const fileRow = page.locator("text=app.py").first().locator("..");
        await expect(fileRow).toBeVisible({ timeout: 10_000 });
        await dismissViteOverlay(page);
        await fileRow.hover({ force: true });

        const trashButton = fileRow.locator("button:has(svg.lucide-trash-2)");
        await expect(trashButton).toBeVisible({ timeout: 5_000 });
    });

    test("clicking trash shows Confirm and X buttons", async ({ page }) => {
        const fileRow = page.locator("text=app.py").first().locator("..");
        await expect(fileRow).toBeVisible({ timeout: 10_000 });
        await dismissViteOverlay(page);
        await fileRow.hover({ force: true });

        const trashButton = fileRow.locator("button:has(svg.lucide-trash-2)");
        await dismissViteOverlay(page);
        await trashButton.click({ force: true });

        const confirmButton = fileRow.locator("button", { hasText: "Confirm" });
        await expect(confirmButton).toBeVisible({ timeout: 5_000 });

        const cancelX = fileRow.locator("button:has(svg.lucide-x)");
        await expect(cancelX).toBeVisible({ timeout: 5_000 });
    });

    test("clicking X cancels the delete and restores trash icon", async ({
        page,
    }) => {
        const fileRow = page.locator("text=app.py").first().locator("..");
        await expect(fileRow).toBeVisible({ timeout: 10_000 });
        await dismissViteOverlay(page);
        await fileRow.hover({ force: true });

        const trashButton = fileRow.locator("button:has(svg.lucide-trash-2)");
        await dismissViteOverlay(page);
        await trashButton.click({ force: true });

        const cancelX = fileRow.locator("button:has(svg.lucide-x)");
        await dismissViteOverlay(page);
        await cancelX.click({ force: true });

        await expect(
            fileRow.locator("button", { hasText: "Confirm" }),
        ).not.toBeVisible({ timeout: 5_000 });

        await dismissViteOverlay(page);
        await fileRow.hover({ force: true });
        await expect(fileRow.locator("button:has(svg.lucide-trash-2)")).toBeVisible(
            { timeout: 5_000 },
        );
    });

    test("clicking Confirm calls DELETE API", async ({ page }) => {
        let deleteCalled = false;
        let deleteUrl = "";

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
        await dismissViteOverlay(page);
        await fileRow.hover({ force: true });

        const trashButton = fileRow.locator("button:has(svg.lucide-trash-2)");
        await dismissViteOverlay(page);
        await trashButton.click({ force: true });

        const confirmButton = fileRow.locator("button", { hasText: "Confirm" });
        await dismissViteOverlay(page);
        await confirmButton.click({ force: true });

        await page.waitForTimeout(500);

        expect(deleteCalled).toBe(true);
        expect(deleteUrl).toContain("/api/user-files/101");
    });

    test("trash icon is hidden when only one file remains", async ({ page }) => {
        await page.unrouteAll();
        await mockUserProfileAPI(page);
        await mockUserFilesAPI(page, [LOOSE_FILES[0]]);
        await mockProjectsAPI(page, []);
        await mockPackagesAPI(page, []);
        await mockDeleteFileAPI(page);
        await blockPyodide(page);

        await page.goto("/");
        await waitForIDEShell(page);
        await waitForFiles(page);

        const fileRow = page.locator("text=app.py").first().locator("..");
        await expect(fileRow).toBeVisible({ timeout: 10_000 });
        await dismissViteOverlay(page);
        await fileRow.hover({ force: true });

        await expect(
            fileRow.locator("button:has(svg.lucide-trash-2)"),
        ).not.toBeVisible({ timeout: 3_000 });
    });
});
