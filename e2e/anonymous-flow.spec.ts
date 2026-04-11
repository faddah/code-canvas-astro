import { test, expect } from "@playwright/test";
import { mockStarterFilesAPI, blockPyodide, dismissViteOverlay, waitForIDEShell } from "./helpers";

test.describe("Anonymous User Flow", () => {
  // Firefox needs extra time — IDE hydration + asset loading can exceed 30s
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await mockStarterFilesAPI(page);
    await blockPyodide(page);
    await page.goto("/");
    await waitForIDEShell(page);
  });

  test("loads the page and shows the IDE", async ({ page }) => {
    // beforeEach already verified the Console panel is visible
    await expect(page.locator(".panel-header >> text=Console").first()).toBeVisible();
  });

  test("shows starter files in the explorer", async ({ page }) => {
    // Starter files should be visible (e.g., main.py) — target the explorer sidebar entry
    await expect(page.locator(".truncate.flex-1", { hasText: "main.py" }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("can write code and run it — sees console output", async ({ page }) => {
    // Pyodide is a ~15MB WASM bundle — Firefox WASM compilation is slower
    test.setTimeout(120_000);

    // Remove the Pyodide block (set by beforeEach) so the real CDN loads
    await page.unrouteAll({ behavior: "wait" });
    await mockStarterFilesAPI(page);
    await page.goto("/");
    await waitForIDEShell(page);

    // Wait for Pyodide to initialize. Race against the failure message so
    // we fail fast with a clear reason if the CDN script fails to load.
    const ready = page.locator("text=Pyodide v0.27.7 initialized ready.");
    const failed = page.locator("text=Failed to load Python environment script.");
    await expect(ready.or(failed)).toBeVisible({ timeout: 90_000 });
    await expect(ready).toBeVisible();

    // The Monaco editor should be present
    const editor = page.locator(".monaco-editor").first();
    await expect(editor).toBeVisible();

    // Use Monaco's API directly — keyboard simulation is unreliable with Monaco's virtual DOM.
    // @monaco-editor/react v4+ sets window.monaco globally via its loader.
    // setValue() fires onDidChangeModelContent, which triggers React's onChange → state update.
    const didSet = await page.evaluate(() => {
      const instance = (window as any).monaco?.editor?.getEditors?.()?.[0];
      if (!instance) return false;
      instance.setValue('print("hello from playwright")');
      return true;
    });
    expect(didSet).toBe(true);

    // Give React a tick to process the onChange from Monaco's content change event
    await page.waitForTimeout(500);

    // Dismiss any vite-error-overlay that may have appeared from transient
    // server errors during the long Pyodide download (dev-server artifact only)
    await dismissViteOverlay(page);

    // Click the Run button
    const runButton = page.locator('button:has-text("Run")').first();
    await runButton.click();

    // Verify output appears in the console — scope to .whitespace-pre-wrap to
    // avoid also matching the same text inside the Monaco editor's syntax spans.
    await expect(
      page.locator(".whitespace-pre-wrap", { hasText: "hello from playwright" }).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
