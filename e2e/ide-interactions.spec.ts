import { test, expect } from "@playwright/test";
import {
    mockStarterFilesAPI,
    blockPyodide,
    waitForIDEShell,
    waitForFiles,
    waitForMonaco,
} from "./helpers";

test.describe("IDE — Console panel", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        await mockStarterFilesAPI(page);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);
    });

    test("shows empty state message when no code has been run", async ({
        page,
    }) => {
        await expect(
        page.locator("text=Ready to execute. Output will appear here...").first(),
        ).toBeVisible({ timeout: 10_000 });
    });

    test("clear button is visible in console header", async ({ page }) => {
        // The clear button uses a Trash2 icon with title="Clear Console"
        const clearButton = page.locator('button[title="Clear Console"]');
        await expect(clearButton).toBeVisible({ timeout: 10_000 });
    });
});

test.describe("IDE — Editor content verification", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        await mockStarterFilesAPI(page);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);
        await waitForFiles(page);
    });

    test("clicking a file loads its content in Monaco", async ({ page }) => {
        // Click main.py in the explorer
        const mainPy = page
        .locator(".truncate.flex-1", { hasText: "main.py" })
        .first();
        await mainPy.click();

        // Wait for Monaco to load
        await expect(await waitForMonaco(page)).toBe(true);

        // Verify Monaco contains the file's content from our mock data
        // Monaco renders text inside .view-line spans
        await expect(
        page.locator(".view-line", { hasText: "hello from e2e" }).first(),
        ).toBeVisible({ timeout: 10_000 });
    });

    test("switching tabs updates editor content", async ({ page }) => {
        const fileEntries = page.locator(".truncate.flex-1");
        await expect(fileEntries.first()).toBeVisible({ timeout: 10_000 });

        // Open main.py
        await fileEntries.nth(0).click();
        await expect(await waitForMonaco(page)).toBe(true);

        // Verify main.py content is shown
        await expect(
        page.locator(".view-line", { hasText: "hello from e2e" }).first(),
        ).toBeVisible({ timeout: 10_000 });

        // Now click utils.py
        await fileEntries.nth(1).click();

        // Verify utils.py content is shown (from MOCK_STARTER_FILES)
        await expect(
        page.locator(".view-line", { hasText: "utility functions" }).first(),
        ).toBeVisible({ timeout: 10_000 });
    });
});

test.describe("IDE — New file dialog (anonymous)", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        await mockStarterFilesAPI(page);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);
        await waitForFiles(page);
    });

    test("+ button opens dropdown with 'New File' option", async ({ page }) => {
        // Click the + button in the Explorer header
        const plusButton = page.locator("button:has(svg.lucide-plus)").first();
        await expect(plusButton).toBeVisible({ timeout: 10_000 });
        await plusButton.click();

        // Dropdown should show "New File" option
        await expect(
        page.locator('[role="menuitem"]', { hasText: "New File" }).first(),
        ).toBeVisible({ timeout: 5_000 });
    });

    test("clicking 'New File' opens the create file dialog", async ({ page }) => {
        // Open the dropdown
        const plusButton = page.locator("button:has(svg.lucide-plus)").first();
        await plusButton.click();

        // Click "New File"
        await page
        .locator('[role="menuitem"]', { hasText: "New File" })
        .first()
        .click();

        // Dialog should appear with title and input
        await expect(page.locator("text=Create New File").first()).toBeVisible({
        timeout: 5_000,
        });

        // Input placeholder should say "script.py"
        await expect(page.locator('input[placeholder="script.py"]')).toBeVisible();
    });

    test("can type a filename and see Add button become enabled", async ({
        page,
    }) => {
        // Open dropdown and click New File
        const plusButton = page.locator("button:has(svg.lucide-plus)").first();
        await plusButton.click();
        await page
        .locator('[role="menuitem"]', { hasText: "New File" })
        .first()
        .click();

        // Wait for dialog
        await expect(page.locator("text=Create New File").first()).toBeVisible({
        timeout: 5_000,
        });

        // Add button should be disabled initially
        const addButton = page.locator('button:has-text("Add")');
        await expect(addButton).toBeDisabled();

        // Type a filename
        const input = page.locator('input[placeholder="script.py"]');
        await input.fill("test.py");

        // Add button should now be enabled
        await expect(addButton).toBeEnabled();
    });

    test("Cancel button closes the dialog", async ({ page }) => {
        // Open dropdown and click New File
        const plusButton = page.locator("button:has(svg.lucide-plus)").first();
        await plusButton.click();
        await page
        .locator('[role="menuitem"]', { hasText: "New File" })
        .first()
        .click();

        // Wait for dialog
        await expect(page.locator("text=Create New File").first()).toBeVisible({
        timeout: 5_000,
        });

        // Click Cancel
        await page.locator('button:has-text("Cancel")').first().click();

        // Dialog should close
        await expect(page.locator("text=Create New File").first()).not.toBeVisible({
        timeout: 5_000,
        });
    });
});

test.describe("IDE — Web Preview panel", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        await mockStarterFilesAPI(page);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);
    });

    test("Web Preview panel header is visible", async ({ page }) => {
        await expect(page.locator("text=Web Preview").first()).toBeVisible({
        timeout: 10_000,
        });
    });
});
