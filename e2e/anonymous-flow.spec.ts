import { test, expect } from "@playwright/test";

test.describe("Anonymous User Flow", () => {
  test("loads the page and shows the IDE", async ({ page }) => {
    await page.goto("/");
    // Wait for React hydration + IDE to appear
    await expect(page.locator(".panel-header >> text=Console").first()).toBeVisible({ timeout: 30_000 });
  });

  test("shows starter files in the explorer", async ({ page }) => {
    await page.goto("/");
    // Wait for the IDE to load
    await expect(page.locator(".panel-header >> text=Console").first()).toBeVisible({ timeout: 30_000 });
    // Starter files should be visible (e.g., main.py) — target the explorer sidebar entry
    await expect(page.locator(".truncate.flex-1", { hasText: "main.py" }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("can write code and run it — sees console output", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".panel-header >> text=Console").first()).toBeVisible({ timeout: 30_000 });

    // Wait for Pyodide to initialize
    await expect(page.locator("text=Pyodide v0.27.7 initialized ready.")).toBeVisible({
      timeout: 60_000,
    });

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
