import { test, expect } from "@playwright/test";
import { mockStarterFilesAPI, waitForIDEShell, waitForMonaco } from "./helpers";

test.describe("Explorer Pane Structure", () => {
  // Firefox needs extra time — IDE hydration + asset loading can exceed 30s
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await mockStarterFilesAPI(page);
    await page.goto("/");
    await waitForIDEShell(page);
  });

  test("Explorer pane is visible on desktop viewports", async ({ page }) => {
    await expect(page.locator("text=Explorer").first()).toBeVisible();
  });

  test("Explorer shows starter files for anonymous users", async ({ page }) => {
    // Wait for starter files to load
    await expect(
      page.locator(".truncate.flex-1").first()
    ).toBeVisible({ timeout: 10_000 });

    // At least one file should be listed
    const fileEntries = page.locator(".truncate.flex-1");
    const count = await fileEntries.count();
    expect(count).toBeGreaterThan(0);
  });

  test("clicking a file shows it in the editor", async ({ page }) => {
    // Wait for files to appear
    const firstFile = page.locator(".truncate.flex-1").first();
    await expect(firstFile).toBeVisible({ timeout: 10_000 });

    // Click the file
    await firstFile.click();

    // Wait for the file to become active (bg-primary highlight) before checking Monaco
    await expect(firstFile.locator("..")).toHaveClass(/bg-primary/, { timeout: 5_000 });

    // Monaco editor should become visible with content
    // Firefox can be slow — Monaco loads web workers and language grammars asynchronously
  const editor = await waitForMonaco(page);
  await expect(editor).toBe(true);
  });

  test("active file has highlighted styling", async ({ page }) => {
    const firstFile = page.locator(".truncate.flex-1").first();
    await expect(firstFile).toBeVisible({ timeout: 10_000 });
    await firstFile.click();

    // The parent div of the active file should have the primary color styling
    const activeFileParent = firstFile.locator("..");
    await expect(activeFileParent).toHaveClass(/bg-primary/, { timeout: 5_000 });
  });

  test("version number is displayed in the header", async ({ page }) => {
    // Pyodide must finish loading — version text only renders when isReady is true
    test.setTimeout(90_000);
    await expect(
      page.locator("text=Environment Ready").first()
    ).toBeVisible({ timeout: 60_000 });

    await expect(
      page.locator("text=Version").first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Run button is present and clickable", async ({ page }) => {
    const runButton = page.locator('button:has-text("Run")').first();
    await expect(runButton).toBeVisible();
  });

  test("Environment status indicator is shown", async ({ page }) => {
    // Should show either "Loading Python..." or "Environment Ready"
    const statusBadge = page.locator("text=Loading Python").or(
      page.locator("text=Environment Ready")
    );
    await expect(statusBadge.first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Explorer file interactions (anonymous)", () => {
  // Firefox needs extra time — IDE hydration + asset loading can exceed 30s
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await mockStarterFilesAPI(page);
    await page.goto("/");
    await waitForIDEShell(page);
  });

  test("files are NOT draggable for anonymous users", async ({ page }) => {
    const firstFile = page.locator(".truncate.flex-1").first();
    await expect(firstFile).toBeVisible({ timeout: 10_000 });

    // The file container should not have draggable="true" for anonymous users
    const fileContainer = firstFile.locator("..");
    const draggable = await fileContainer.getAttribute("draggable");
    // Anonymous users should not have draggable files
    expect(draggable).not.toBe("true");
  });
});

test.describe("API Routes - Projects", () => {
  test("GET /api/projects returns 401 for unauthenticated request", async ({
    request,
  }) => {
    const response = await request.get("/api/projects");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("POST /api/projects/create returns 401 for unauthenticated request", async ({
    request,
  }) => {
    const response = await request.post("/api/projects/create", {
      data: { name: "Test Project" },
    });
    expect(response.status()).toBe(401);
  });

  test("DELETE /api/projects/1 returns 401 for unauthenticated request", async ({
    request,
  }) => {
    const response = await request.delete("/api/projects/1");
    expect(response.status()).toBe(401);
  });

  test("PUT /api/projects/1 returns 401 for unauthenticated request", async ({
    request,
  }) => {
    const response = await request.put("/api/projects/1", {
      data: { name: "Updated" },
    });
    expect(response.status()).toBe(401);
  });

  test("GET /api/projects/1 returns 401 for unauthenticated request", async ({
    request,
  }) => {
    const response = await request.get("/api/projects/1");
    expect(response.status()).toBe(401);
  });
});
