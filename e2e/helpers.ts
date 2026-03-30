import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

// Mock starter files returned by the API
export const MOCK_STARTER_FILES = [
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

/** Intercept /api/starter-files → return mock data (avoids Turso DB errors) */
export async function mockStarterFilesAPI(page: Page) {
  await page.route("**/api/starter-files", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_STARTER_FILES),
    })
  );
}

/** Block Pyodide CDN with empty JS (avoids vite-error-overlay from route.abort()) */
export async function blockPyodide(page: Page) {
  await page.route("**/cdn.jsdelivr.net/pyodide/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: "// pyodide blocked for testing",
    })
  );
}

/**
 * Remove any <vite-error-overlay> currently in the DOM.
 *
 * The overlay uses `position: fixed; inset: 0` and blocks ALL pointer events.
 * In production there is no Vite overlay — it's purely a dev-server artifact.
 * Call this before any click that might be blocked by a transient server error.
 */
export async function dismissViteOverlay(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll("vite-error-overlay").forEach((el) => el.remove());
  });
}

/** Wait for the IDE shell to render (Console panel visible) */
export async function waitForIDEShell(page: Page) {
  await expect(
    page.locator(".panel-header >> text=Console").first()
  ).toBeVisible({ timeout: 45_000 });
}

/** Wait for at least one file in the Explorer */
export async function waitForFiles(page: Page) {
  await expect(
    page.locator(".truncate.flex-1").first()
  ).toBeVisible({ timeout: 15_000 });
}
