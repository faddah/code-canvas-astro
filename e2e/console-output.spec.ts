import { test, expect } from "@playwright/test";
import {
    mockStarterFilesAPI,
    mockPyodide,
    waitForIDEShell,
    dismissViteOverlay,
} from "./helpers";

test.describe("Console — code execution output (mock Pyodide)", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        await mockStarterFilesAPI(page);
        await mockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);
    });

    test("mock Pyodide initializes and shows ready message", async ({
        page,
    }) => {
        await expect(
            page
                .locator(".whitespace-pre-wrap", {
                    hasText: "Pyodide v0.27.7 initialized ready.",
                })
                .first(),
        ).toBeVisible({ timeout: 15_000 });
    });

    test("Run button produces console output", async ({ page }) => {
        // Wait for Pyodide ready
        await expect(
            page
                .locator(".whitespace-pre-wrap", {
                    hasText: "Pyodide v0.27.7 initialized ready.",
                })
                .first(),
        ).toBeVisible({ timeout: 15_000 });

        // Wait for Monaco editor
        await expect(
            page.locator(".monaco-editor").first(),
        ).toBeVisible({ timeout: 30_000 });

        // Set editor content via Monaco API
        const didSet = await page.evaluate(() => {
            const instance = (window as any).monaco?.editor
                ?.getEditors?.()?.[0];
            if (!instance) return false;
            instance.setValue('print("hello from mock pyodide")');
            return true;
        });
        expect(didSet).toBe(true);
        await page.waitForTimeout(300);

        // Click Run
        await dismissViteOverlay(page);
        const runButton = page.locator('button:has-text("Run")').first();
        await runButton.click({ force: true });

        // Verify output appears in console
        await expect(
            page
                .locator(".whitespace-pre-wrap", {
                    hasText: "hello from mock pyodide",
                })
                .first(),
        ).toBeVisible({ timeout: 10_000 });
    });

    test("multiple print() calls produce multiple output lines", async ({
        page,
    }) => {
        await expect(
            page
                .locator(".whitespace-pre-wrap", {
                    hasText: "Pyodide v0.27.7 initialized ready.",
                })
                .first(),
        ).toBeVisible({ timeout: 15_000 });

        await expect(
            page.locator(".monaco-editor").first(),
        ).toBeVisible({ timeout: 30_000 });

        const didSet = await page.evaluate(() => {
            const instance = (window as any).monaco?.editor
                ?.getEditors?.()?.[0];
            if (!instance) return false;
            instance.setValue(
                'print("line one")\nprint("line two")\nprint("line three")',
            );
            return true;
        });
        expect(didSet).toBe(true);
        await page.waitForTimeout(300);

        await dismissViteOverlay(page);
        await page.locator('button:has-text("Run")').first().click({ force: true });

        await expect(
            page
                .locator(".whitespace-pre-wrap", { hasText: "line one" })
                .first(),
        ).toBeVisible({ timeout: 10_000 });
        await expect(
            page
                .locator(".whitespace-pre-wrap", { hasText: "line two" })
                .first(),
        ).toBeVisible();
        await expect(
            page
                .locator(".whitespace-pre-wrap", { hasText: "line three" })
                .first(),
        ).toBeVisible();
    });

    test("Python error shows in console with [Error] prefix", async ({
        page,
    }) => {
        await expect(
            page
                .locator(".whitespace-pre-wrap", {
                    hasText: "Pyodide v0.27.7 initialized ready.",
                })
                .first(),
        ).toBeVisible({ timeout: 15_000 });

        await expect(
            page.locator(".monaco-editor").first(),
        ).toBeVisible({ timeout: 30_000 });

        const didSet = await page.evaluate(() => {
            const instance = (window as any).monaco?.editor
                ?.getEditors?.()?.[0];
            if (!instance) return false;
            instance.setValue('raise Exception("kaboom")');
            return true;
        });
        expect(didSet).toBe(true);
        await page.waitForTimeout(300);

        await dismissViteOverlay(page);
        await page.locator('button:has-text("Run")').first().click({ force: true });

        // Error output has [Error] prefix and red-400 styling
        await expect(
            page
                .locator(".whitespace-pre-wrap.text-red-400", {
                    hasText: "[Error]",
                })
                .first(),
        ).toBeVisible({ timeout: 20_000 });

        await expect(
            page
                .locator(".whitespace-pre-wrap", { hasText: "kaboom" })
                .first(),
        ).toBeVisible();
    });

    test("Clear console button removes all output", async ({ page }) => {
        // Wait for initialized message
        await expect(
            page
                .locator(".whitespace-pre-wrap", {
                    hasText: "Pyodide v0.27.7 initialized ready.",
                })
                .first(),
        ).toBeVisible({ timeout: 15_000 });

        // Click Clear Console
        await dismissViteOverlay(page);
        await page
            .locator('button[title="Clear Console"]')
            .click({ force: true });

        // Should show empty state message
        await expect(
            page
                .locator("text=Ready to execute. Output will appear here...")
                .first(),
        ).toBeVisible({ timeout: 5_000 });
    });
});