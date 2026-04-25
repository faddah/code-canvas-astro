import { test, expect } from "@playwright/test";
import {
    mockStarterFilesAPI,
    mockPyodide,
    waitForIDEShell,
    dismissViteOverlay,
    waitForMonaco
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
                .getByTestId("console-line")
                .filter({ hasText: "Pyodide v0.27.7 initialized ready." })
                .first(),
        ).toBeVisible({ timeout: 15_000 });
    });

    test("Run button produces console output", async ({ page }) => {
        // Wait for Pyodide ready
        await expect(
            page
                .getByTestId("console-line")
                .filter({ hasText: "Pyodide v0.27.7 initialized ready." })
                .first(),
        ).toBeVisible({ timeout: 15_000 });

        // Wait for Monaco editor
        await expect(await waitForMonaco(page)).toBe(true);

        // Set editor content via Monaco API
        const didSet = await page.evaluate(() => {
            const instance = (window as any).monaco?.editor?.getEditors?.()?.[0];
            if (!instance) return false;
            const model = instance.getModel();
            if (!model) return false;
            // executeEdits fires onDidChangeModelContent reliably through
            // the undo stack — avoids the setValue-misses-subscription race.
            instance.executeEdits("test", [{
                range: model.getFullModelRange(),
                text: 'print("hello from mock pyodide")',
            }]);
            return true;
        });
        expect(didSet).toBe(true);
        await expect(
            page
                .locator(".view-line", { hasText: "hello from mock pyodide" })
                .first(),
        ).toBeVisible({ timeout: 20_000 });
        await page.evaluate(() => new Promise<void>((r) => {
            requestAnimationFrame(() => requestAnimationFrame(() => r()));
        }));

        await page.waitForFunction(
            (expected) =>
                document.querySelector('[data-testid="editor-state-content"]')?.textContent?.includes(expected),
                "hello from mock pyodide",
                { timeout: 20_000 },
        );

        // Click Run
        await dismissViteOverlay(page);
        const runButton = page.locator('button:has-text("Run")').first();
        await runButton.click({ force: true });

        // Wait for Pyodide's async stdout callback to flush into console state
        // before asserting visibility — prevents Monaco→Run→console race.
        await page.waitForFunction(
            (expected) =>
                Array.from(
                    document.querySelectorAll('[data-testid="console-line"]'),
                ).some((el) => el.textContent?.includes(expected)),
                "hello from mock pyodide",
                { timeout: 15_000 },
        );
        await expect(
            page
                .getByTestId("console-line")
                .filter({ hasText: "hello from mock pyodide" })
                .first(),
        ).toBeVisible({ timeout: 10_000 });
    });

    test("multiple print() calls produce multiple output lines", async ({
        page,
    }) => {
        await expect(
            page
                .getByTestId("console-line")
                .filter({ hasText: "Pyodide v0.27.7 initialized ready." })
                .first(),
        ).toBeVisible({ timeout: 15_000 });

        await expect(await waitForMonaco(page)).toBe(true);

        const didSet = await page.evaluate(() => {
            const instance = (window as any).monaco?.editor?.getEditors?.()?.[0];
            if (!instance) return false;
            const model = instance.getModel();
            if (!model) return false;
            instance.executeEdits("test", [{
                range: model.getFullModelRange(),
                text: 'print("line one")\nprint("line two")\nprint("line three")',
            }]);
            return true;
        });
        expect(didSet).toBe(true);
        await expect(
            page.locator(".view-line", { hasText: "line one" }).first(),
        ).toBeVisible({ timeout: 20_000 });
        await page.evaluate(() => new Promise<void>((r) => {
            requestAnimationFrame(() => requestAnimationFrame(() => r()));
        }));

        await page.waitForFunction(
            (expected) =>
                document.querySelector('[data-testid="editor-state-content"]')?.textContent?.includes(expected),
                "line one",
                { timeout: 20_000 },
        );

        await dismissViteOverlay(page);
        await page.locator('button:has-text("Run")').first().click({ force: true });

        // Wait for the LAST print to flush — line three present ⇒ all three have flushed.
        await page.waitForFunction(
            () =>
                Array.from(
                    document.querySelectorAll('[data-testid="console-line"]'),
                ).some((el) => el.textContent?.includes("line three")),
            null,
            { timeout: 15_000 },
        );
        await expect(
            page
                .getByTestId("console-line")
                .filter({ hasText: "line one" })
                .first(),
        ).toBeVisible();
        await expect(
            page
                .getByTestId("console-line")
                .filter({ hasText: "line two" })
                .first(),
        ).toBeVisible();
        await expect(
            page
                .getByTestId("console-line")
                .filter({ hasText: "line three" })
                .first(),
        ).toBeVisible();
    });

    test("Python error shows in console with [Error] prefix", async ({
        page,
    }) => {
        await expect(
            page
                .getByTestId("console-line")
                .filter({ hasText: "Pyodide v0.27.7 initialized ready." })
                .first(),
        ).toBeVisible({ timeout: 15_000 });

        await expect(await waitForMonaco(page)).toBe(true);

        const didSet = await page.evaluate(() => {
            const instance = (window as any).monaco?.editor?.getEditors?.()?.[0];
            if (!instance) return false;
            const model = instance.getModel();
            if (!model) return false;
            instance.executeEdits("test", [{
                range: model.getFullModelRange(),
                text: 'raise Exception("kaboom")',
            }]);;
            return true;
        });
        expect(didSet).toBe(true);
        await expect(
            page.locator(".view-line", { hasText: "kaboom" }).first(),
        ).toBeVisible({ timeout: 5_000 });
        await page.evaluate(() => new Promise<void>((r) => {
            requestAnimationFrame(() => requestAnimationFrame(() => r()));
        }));

        await page.waitForFunction(
            (expected) =>
                document.querySelector('[data-testid="editor-state-content"]')?.textContent?.includes(expected),
                "kaboom",
                { timeout: 20_000 },
        );

        await dismissViteOverlay(page);
        await page.locator('button:has-text("Run")').first().click({ force: true });

        // Error output has [Error] prefix and red-400 styling.
        // Split into two assertions: first wait for the error text to
        // appear in the DOM (confirms Pyodide error was appended to state),
        // then verify the red-error styling was applied to that same line.
        // Wait for Pyodide's error handler to append [Error] (async try/catch path).
        await page.waitForFunction(
            () =>
                Array.from(
                    document.querySelectorAll('[data-testid="console-line"]'),
                ).some((el) => el.textContent?.includes("[Error]")),
            null,
            { timeout: 30_000 },
        );
        const errorLine = page
            .getByTestId("console-line")
            .filter({ hasText: "[Error]" })
            .first();
        await expect(errorLine).toBeVisible({ timeout: 10_000 });
        // Assert the semantic data attribute, not the CSS color class.
        await expect(errorLine).toHaveAttribute("data-log-kind", "error");
        await expect(
            page
                .getByTestId("console-line")
                .filter({ hasText: "kaboom" })
                .first(),
        ).toBeVisible();
    });

    test("Clear console button removes all output", async ({ page }) => {
        // Wait for initialized message
        await expect(
            page
                .getByTestId("console-line")
                .filter({ hasText: "Pyodide v0.27.7 initialized ready." })
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