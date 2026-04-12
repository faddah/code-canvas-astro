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
    mockUpdateFileAPI,
} from "./helpers";

test.describe("Keyboard shortcut Cmd+S / Ctrl+S", () => {
test.setTimeout(60_000);

test.beforeEach(async ({ page }) => {
    await mockUserProfileAPI(page);
    await mockUserFilesAPI(page);
    await mockProjectsAPI(page);
    await mockPackagesAPI(page);
    await mockUpdateFileAPI(page);
    await blockPyodide(page);
    await page.goto("/");
    await waitForIDEShell(page);
    await waitForFiles(page);
});

test("Ctrl+S saves the active file when there are unsaved changes", async ({
        page,
    }) => {
        // Click on solo.py to make it the active file
        await dismissViteOverlay(page);
        await page
            .locator(".truncate.flex-1", { hasText: "solo.py" })
            .first()
            .click({ force: true });

        // Wait for the editor to load with the file content
        await expect(page.locator(".monaco-editor").first()).toBeVisible({
            timeout: 10_000,
        });

        // Type into the Monaco editor to create unsaved changes
        await page.locator(".monaco-editor .view-lines").first().click({ force: true });
        await page.keyboard.type("# edited line");

        // Press Ctrl+S and verify the PUT request fires
        const putRequest = page.waitForRequest(
        (req) =>
            req.url().includes("/api/user-files/") && req.method() === "PUT",
        );
        await page.keyboard.press("Control+s");
        const req = await putRequest;
        expect(req.method()).toBe("PUT");

        // "Saved" toast should appear
        await expect(page.locator("text=Saved").first()).toBeVisible({
            timeout: 5_000,
        });
    });

    test("Ctrl+S shows 'No changes' toast when file has no unsaved changes", async ({
        page,
    }) => {
        // Click on solo.py (no edits — no unsaved changes)
        await dismissViteOverlay(page);
        await page
            .locator(".truncate.flex-1", { hasText: "solo.py" })
            .first()
            .click({ force: true });

        // Wait for the editor to load
        await expect(page.locator(".monaco-editor").first()).toBeVisible({
            timeout: 10_000,
        });

        // Press Ctrl+S without editing — should show "No changes"
        await page.keyboard.press("Control+s");
        await expect(page.locator("text=No changes").first()).toBeVisible({
            timeout: 5_000,
        });
    });
});