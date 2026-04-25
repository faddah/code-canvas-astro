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

test.describe("Save As — authenticated save flow", () => {
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

    test("Save As opens dialog with current file name pre-filled", async ({
        page,
    }) => {
        // Click on solo.py (loose file, visible without expanding a project)
        await dismissViteOverlay(page);
        await page
            .locator(".truncate.flex-1", { hasText: "solo.py" })
            .first()
            .click({ force: true });

        // Click Save As button in the nav bar
        await dismissViteOverlay(page);
        await page.locator('button:has-text("Save As")').click({ force: true });

        // Dialog should appear with title "Save File"
        await expect(
            page.locator('[role="dialog"]').locator("text=Save File"),
        ).toBeVisible({ timeout: 5_000 });

        // File name input should be pre-filled with "solo.py"
        const nameInput = page.locator('[role="dialog"] input');
        await expect(nameInput).toHaveValue("solo.py");
    });

    test("Save As submits PUT request and closes dialog", async ({ page }) => {
        // Select solo.py
        await dismissViteOverlay(page);
        await page
            .locator(".truncate.flex-1", { hasText: "solo.py" })
            .first()
            .click({ force: true });

        // Open Save As dialog
        await dismissViteOverlay(page);
        await page.locator('button:has-text("Save As")').click({ force: true });
        await expect(
            page.locator('[role="dialog"]').locator("text=Save File"),
        ).toBeVisible({ timeout: 5_000 });

        // Change the file name
        const nameInput = page.locator('[role="dialog"] input');
        await nameInput.clear();
        await nameInput.fill("renamed.py");

        // Click Save and verify PUT is called
        const putRequest = page.waitForRequest(
            (req) =>
                req.url().includes("/api/user-files/") && req.method() === "PUT",
        );
        await dismissViteOverlay(page);
        await page
            .locator('[role="dialog"] button:has-text("Save")')
            .click({ force: true });
        const req = await putRequest;
        const body = JSON.parse(req.postData() || "{}");
        expect(body.name).toBe("renamed.py");

        // Dialog should close
        await expect(
            page.locator('[role="dialog"]').locator("text=Save File"),
        ).not.toBeVisible({ timeout: 5_000 });
    });

    test("Save As validates empty file name", async ({ page }) => {
        // Select solo.py
        await dismissViteOverlay(page);
        await page
            .locator(".truncate.flex-1", { hasText: "solo.py" })
            .first()
            .click({ force: true });

        // Open Save As dialog
        await dismissViteOverlay(page);
        await page.locator('button:has-text("Save As")').click({ force: true });
        await expect(
            page.locator('[role="dialog"]').locator("text=Save File"),
        ).toBeVisible({ timeout: 5_000 });

        // Clear the name
        const nameInput = page.locator('[role="dialog"] input');
        await nameInput.clear();

        // Save button should be disabled when name is empty
        const saveButton = page.locator(
            '[role="dialog"] button:has-text("Save")',
        );
        await expect(saveButton).toBeDisabled();
    });

    test("Save As validates invalid file extension", async ({ page }) => {
        // Select solo.py
        await dismissViteOverlay(page);
        await page
            .locator(".truncate.flex-1", { hasText: "solo.py" })
            .first()
            .click({ force: true });

        // Open Save As dialog
        await dismissViteOverlay(page);
        await page.locator('button:has-text("Save As")').click({ force: true });
        await expect(
            page.locator('[role="dialog"]').locator("text=Save File"),
        ).toBeVisible({ timeout: 5_000 });

        // Type an invalid extension
        const nameInput = page.locator('[role="dialog"] input');
        await nameInput.clear();
        await nameInput.fill("badfile.js");

        // Click Save — should show error
        await dismissViteOverlay(page);
        await page
            .locator('[role="dialog"] button:has-text("Save")')
            .click({ force: true });

        // Error message about allowed extensions
        await expect(
            page.locator("#save-file-name-error"),
        ).toBeVisible({ timeout: 5_000 });
    });

    test("Save As Cancel closes dialog without saving", async ({ page }) => {
        // Select solo.py
        await dismissViteOverlay(page);
        await page
            .locator(".truncate.flex-1", { hasText: "solo.py" })
            .first()
            .click({ force: true });

        // Open Save As dialog
        await dismissViteOverlay(page);
        await page.locator('button:has-text("Save As")').click({ force: true });
        await expect(
            page.locator('[role="dialog"]').locator("text=Save File"),
        ).toBeVisible({ timeout: 5_000 });

        // Click Cancel
        await dismissViteOverlay(page);
        await page
            .locator('[role="dialog"] button:has-text("Cancel")')
            .click({ force: true });

        // Dialog should close
        await expect(
            page.locator('[role="dialog"]').locator("text=Save File"),
        ).not.toBeVisible({ timeout: 5_000 });
    });
});
