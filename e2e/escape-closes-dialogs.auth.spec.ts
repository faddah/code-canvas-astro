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
} from "./helpers";

test.describe("Escape key closes dialogs", () => {
    test.setTimeout(60_000);

    test.describe("with profile complete", () => {
        test.beforeEach(async ({ page }) => {
            await mockUserProfileAPI(page);
            await mockUserFilesAPI(page);
            await mockProjectsAPI(page, []);
            await mockPackagesAPI(page, []);
            await blockPyodide(page);
            await page.goto("/");
            await waitForIDEShell(page);
            await waitForFiles(page);
        });

        test("Escape closes the New Project dialog", async ({ page }) => {
            const newProjectBtn = page.locator('button[title="New Project"]');
            await expect(newProjectBtn).toBeVisible({ timeout: 10_000 });
            await newProjectBtn.click();

            const dialogTitle = page.locator("text=Create New Project").first();
            await expect(dialogTitle).toBeVisible({ timeout: 5_000 });

            await page.keyboard.press("Escape");

            await expect(dialogTitle).not.toBeVisible({ timeout: 5_000 });
        });

        test("Escape closes the New File dialog", async ({ page }) => {
            // Open the + dropdown
            const plusButton = page.locator('button:has(svg.lucide-plus)').first();
            await expect(plusButton).toBeVisible({ timeout: 10_000 });
            await plusButton.click();

            // Click "New File" in the dropdown
            const newFileItem = page.locator('text=New File').first();
            await expect(newFileItem).toBeVisible({ timeout: 5_000 });
            await newFileItem.click();

            const dialogTitle = page.locator("text=Create New File").first();
            await expect(dialogTitle).toBeVisible({ timeout: 5_000 });

            await page.keyboard.press("Escape");

            await expect(dialogTitle).not.toBeVisible({ timeout: 5_000 });
        });

        test("Escape closes the Add Package dialog", async ({ page }) => {
            const addBtn = page.locator('button[title="Add Package"]');
            await expect(addBtn).toBeVisible({ timeout: 10_000 });
            await addBtn.click();

            const dialogTitle = page.locator("text=Add Package").first();
            await expect(dialogTitle).toBeVisible({ timeout: 5_000 });

            await page.keyboard.press("Escape");

            await expect(dialogTitle).not.toBeVisible({ timeout: 5_000 });
        });

        test("Escape closes the Save As dialog", async ({ page }) => {
            const saveAsBtn = page.locator('button:has-text("Save As")');
            await expect(saveAsBtn).toBeVisible({ timeout: 10_000 });
            await saveAsBtn.click();

            const dialogTitle = page.locator("text=Save File").first();
            await expect(dialogTitle).toBeVisible({ timeout: 5_000 });

            await page.keyboard.press("Escape");

            await expect(dialogTitle).not.toBeVisible({ timeout: 5_000 });
        });

        test("Escape closes the Open / Import dialog", async ({ page }) => {
            const importBtn = page.locator('button:has-text("Open / Import")');
            await expect(importBtn).toBeVisible({ timeout: 10_000 });
            await importBtn.click();

            const dialogTitle = page.locator("text=Open / Import Files").first();
            await expect(dialogTitle).toBeVisible({ timeout: 5_000 });

            await page.keyboard.press("Escape");

            await expect(dialogTitle).not.toBeVisible({ timeout: 5_000 });
        });
    });

    test.describe("Complete Profile dialog", () => {
        test("Escape closes the Complete Profile dialog", async ({ page }) => {
            // Mock profile as null to trigger the CompleteProfile modal
            await mockUserProfileAPI(page, null);
            await mockUserFilesAPI(page);
            await mockProjectsAPI(page, []);
            await mockPackagesAPI(page, []);
            await blockPyodide(page);
            await page.goto("/");
            await waitForIDEShell(page);

            const dialogTitle = page.locator("text=Complete Your Profile").first();
            await expect(dialogTitle).toBeVisible({ timeout: 15_000 });

            await page.keyboard.press("Escape");

            await expect(dialogTitle).not.toBeVisible({ timeout: 5_000 });
        });
    });
});