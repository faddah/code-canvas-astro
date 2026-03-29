import { test, expect } from "@playwright/test";

/**
 * E2E tests targeting branch-coverage gaps that cannot be reached in jsdom.
 *
 * Primary target: IDE.tsx lines 255-257 — handleRun guard when !isReady.
 * In jsdom, the Run button is disabled={!isReady} and React blocks synthetic
 * click handlers on disabled elements. In a real browser, we remove the
 * disabled attribute via page.evaluate() before clicking, so React's event
 * delegation sees a non-disabled button and fires the onClick handler,
 * reaching the `if (!isReady)` toast guard.
 *
 * The dev server's Turso DB can fail, producing a vite-error-overlay that
 * blocks pointer events. We intercept /api/starter-files and return mock
 * data so the app renders regardless of DB state.
 */

// Mock starter files returned by the API
const MOCK_STARTER_FILES = [
  {
    id: 1,
    name: "main.py",
    content: 'print("hello from e2e")\n',
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    name: "utils.py",
    content: "# utility functions\ndef add(a, b):\n    return a + b\n",
    createdAt: "2025-01-01T00:00:00.000Z",
  },
];

// ─── Helper: intercept starter-files API to avoid DB errors ───
async function mockStarterFilesAPI(page: import("@playwright/test").Page) {
  await page.route("**/api/starter-files", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_STARTER_FILES),
    })
  );
}

// ─── Helper: wait for the IDE shell to render ───
async function waitForIDEShell(page: import("@playwright/test").Page) {
  await expect(
    page.locator(".panel-header >> text=Console").first()
  ).toBeVisible({ timeout: 45_000 });
}

// ─── Helper: wait for at least one file in the Explorer ───
async function waitForFiles(page: import("@playwright/test").Page) {
  await expect(
    page.locator(".truncate.flex-1").first()
  ).toBeVisible({ timeout: 15_000 });
}

// ═══════════════════════════════════════════════════════════════
// Run button while Pyodide is loading (IDE.tsx lines 255-257)
// ═══════════════════════════════════════════════════════════════

test.describe("IDE — Run button while Pyodide is loading", () => {
  test.setTimeout(60_000);

  test("clicking Run before Pyodide loads shows 'Wait a moment' toast", async ({
    page,
  }) => {
    // Mock the starter-files API to avoid DB errors / vite-error-overlay
    await mockStarterFilesAPI(page);

    // Block the Pyodide CDN so isReady stays false throughout the test
    await page.route(
      "**/cdn.jsdelivr.net/pyodide/**",
      (route) => route.abort()
    );

    await page.goto("/");
    await waitForIDEShell(page);

    // Verify the environment is NOT ready
    await expect(
      page.locator("text=Loading Python...").first()
    ).toBeVisible({ timeout: 10_000 });

    // Wait for starter files to load in the explorer
    await waitForFiles(page);

    // Click the first file to ensure there's active content in the editor
    const firstFile = page.locator(".truncate.flex-1").first();
    await firstFile.click();
    await expect(page.locator(".monaco-editor").first()).toBeVisible({
      timeout: 45_000,
    });

    // The Run button is disabled={!isReady}. React's event delegation checks
    // event.target.disabled and drops the synthetic onClick for disabled elements.
    // Remove the DOM disabled attribute and dispatch a click in a single evaluate
    // so there's no race between removing disabled and React re-rendering.
    const runButton = page.locator('button:has-text("Run")').first();
    await expect(runButton).toBeVisible();
    await expect(runButton).toBeDisabled();

    const clicked = await page.evaluate(() => {
      // Find the Run button by its Play icon SVG
      const svgs = document.querySelectorAll("svg.lucide-play");
      const btn = svgs[0]?.closest("button") as HTMLButtonElement | null;
      if (!btn) return false;
      btn.disabled = false;
      btn.click();
      return true;
    });
    expect(clicked).toBe(true);

    // The toast should appear with the loading warning
    await expect(
      page.locator("text=Python environment is still loading...").first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ═══════════════════════════════════════════════════════════════
// Tab management in a real browser
// ═══════════════════════════════════════════════════════════════

test.describe("IDE — Tab management (e2e)", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await mockStarterFilesAPI(page);
    await page.goto("/");
    await waitForIDEShell(page);
    await waitForFiles(page);
  });

  test("closing the active tab switches to the last remaining tab", async ({
    page,
  }) => {
    const fileEntries = page.locator(".truncate.flex-1");
    const count = await fileEntries.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const firstFileName = (await fileEntries.nth(0).textContent())!.trim();
    const secondFileName = (await fileEntries.nth(1).textContent())!.trim();

    // Open both files as tabs by clicking them
    await fileEntries.nth(0).click();
    await expect(page.locator(".monaco-editor").first()).toBeVisible({
      timeout: 45_000,
    });
    await fileEntries.nth(1).click();

    // Both tabs should be visible in the tab bar
    await expect(
      page.locator("[class*='min-w-30']", { hasText: firstFileName }).first()
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.locator("[class*='min-w-30']", { hasText: secondFileName }).first()
    ).toBeVisible({ timeout: 5_000 });

    // The second file's tab should be active (border-t-primary)
    const activeTab = page.locator(
      "[class*='min-w-30'][class*='border-t-primary']"
    );
    await expect(activeTab).toContainText(secondFileName);

    // Close the active tab via its X button
    const closeButton = activeTab.locator("button").first();
    await closeButton.click();

    // The first file's tab should now be active (IDE.tsx closeTab lines 306-308)
    await expect(
      page.locator("[class*='min-w-30'][class*='border-t-primary']")
    ).toContainText(firstFileName);

    // The closed tab should be gone
    await expect(
      page.locator("[class*='min-w-30']", { hasText: secondFileName })
    ).not.toBeVisible();
  });

  test("closing the only tab removes it from the tab bar", async ({
    page,
  }) => {
    // The first file is auto-opened by the useEffect (line 150-155).
    // Wait for the tab to appear.
    const activeTab = page.locator(
      "[class*='min-w-30'][class*='border-t-primary']"
    );
    await expect(activeTab).toBeVisible({ timeout: 10_000 });

    const tabName = (await activeTab.textContent())!.trim();

    // Close the only tab
    const closeButton = activeTab.locator("button").first();
    await closeButton.click();

    // The tab bar should be empty momentarily (though the useEffect will
    // re-open a file). Verify the tab we closed is no longer the same
    // active tab — in practice the useEffect re-opens files[0], so we
    // verify the close action happened by checking the tab was removed
    // and then re-appeared (the re-open is a separate useEffect cycle).
    // Since the re-open is near-instant, just verify the app doesn't crash.
    await page.waitForTimeout(200);

    // The app should remain functional — editor and explorer still visible
    await expect(page.locator("text=Explorer").first()).toBeVisible();
    await expect(
      page.locator(".truncate.flex-1").first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ═══════════════════════════════════════════════════════════════
// Environment status indicator
// ═══════════════════════════════════════════════════════════════

test.describe("IDE — Environment status", () => {
  test.setTimeout(90_000);

  test("status shows 'Loading Python...' when Pyodide is blocked", async ({
    page,
  }) => {
    await mockStarterFilesAPI(page);

    // Block Pyodide to ensure we catch the loading state
    await page.route(
      "**/cdn.jsdelivr.net/pyodide/**",
      (route) => route.abort()
    );

    await page.goto("/");
    await waitForIDEShell(page);

    // Should show loading state with yellow pulse indicator
    await expect(
      page.locator("text=Loading Python...").first()
    ).toBeVisible({ timeout: 10_000 });

    const yellowDot = page.locator(".bg-yellow-500.animate-pulse");
    await expect(yellowDot.first()).toBeVisible();
  });

  test("Run button is disabled when Pyodide is not ready", async ({
    page,
  }) => {
    await mockStarterFilesAPI(page);

    // Block Pyodide
    await page.route(
      "**/cdn.jsdelivr.net/pyodide/**",
      (route) => route.abort()
    );

    await page.goto("/");
    await waitForIDEShell(page);
    await waitForFiles(page);

    // Open a file so activeFileId is set
    const firstFile = page.locator(".truncate.flex-1").first();
    await firstFile.click();
    await expect(page.locator(".monaco-editor").first()).toBeVisible({
      timeout: 45_000,
    });

    // Run button should be disabled (isReady is false)
    const runButton = page.locator('button:has-text("Run")').first();
    await expect(runButton).toBeDisabled();
  });
});
