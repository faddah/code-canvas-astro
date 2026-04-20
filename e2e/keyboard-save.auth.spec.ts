import { test, expect } from "./fixtures/authenticated";
import {
    blockPyodide,
    dismissViteOverlay,
    waitForIDEShell,
    waitForFiles,
    waitForMonaco,
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

    // Wait for the editor to load
    await expect(await waitForMonaco(page)).toBe(true);

    // Modify the editor content via Monaco API to trigger handleEditorChange
    await page.evaluate(() => {
        const instance = (window as any).monaco?.editor?.getEditors?.()?.[0];
        if (instance) {
            instance.setValue("# edited via monaco API\nprint('changed')\n");
        }
    });
    await expect(
        page.locator(".view-line", { hasText: "edited via monaco API" }).first(),
    ).toBeVisible({ timeout: 20_000 });
    // Small wait for React state to propagate the unsaved change
    await page.evaluate(() => new Promise<void>((r) => {
        requestAnimationFrame(() => requestAnimationFrame(() => r()));
    }));
    // Verify the activeContent mirror before pressing Ctrl+S.
    // Prevents WebKit race where keyboard event fires
    // before unsavedChanges state commits.
    await page.waitForFunction(
        (expected) => 
            document.querySelector('[data-testid="editor-state-content"]')?.textContent?.includes(expected),
        "edited via monaco API",
        { timeout: 20_000 },
    );

    // Set up the request listener BEFORE pressing the key
    const putPromise = page.waitForRequest(
        (req) =>
        req.url().includes("/api/user-files/") && req.method() === "PUT",
    );

    // Press Ctrl+S
    await page.keyboard.press("Control+s");

    // Verify the PUT request fires
    const req = await putPromise;
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
        await expect(await waitForMonaco(page)).toBe(true);

        // Press Ctrl+S without editing — should show "No changes"
        await page.keyboard.press("Control+s");
        await expect(page.locator("text=No changes").first()).toBeVisible({
            timeout: 5_000,
        });
    });
});