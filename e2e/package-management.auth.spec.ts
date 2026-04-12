import { test, expect } from "./fixtures/authenticated";
import {
    blockPyodide,
    waitForIDEShell,
    waitForFiles,
    mockUserProfileAPI,
    mockUserFilesAPI,
    mockProjectsAPI,
    mockPackagesAPI,
    mockAddPackageAPI,
    mockDeletePackageAPI,
    MOCK_PACKAGES,
} from "./helpers";

test.describe("Package management — display", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        await mockUserProfileAPI(page);
        await mockUserFilesAPI(page);
        await mockProjectsAPI(page);
        await mockPackagesAPI(page);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);
        await waitForFiles(page);
    });

    test("Packages section is visible for signed-in users", async ({ page }) => {
        await expect(page.locator("text=Packages").first()).toBeVisible({
            timeout: 10_000,
        });
    });

    test("installed packages are listed", async ({ page }) => {
        await expect(page.locator("text=numpy").first()).toBeVisible({
            timeout: 10_000,
        });

        await expect(page.locator("text=requests").first()).toBeVisible();
    });
    });

test.describe("Package management — empty state", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        await mockUserProfileAPI(page);
        await mockUserFilesAPI(page);
        await mockProjectsAPI(page);
        await mockPackagesAPI(page, []);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);
        await waitForFiles(page);
    });

    test("shows empty message when no packages installed", async ({ page }) => {
        await expect(page.locator("text=No packages").first()).toBeVisible({
            timeout: 10_000,
        });
    });
});

test.describe("Package management — add package", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        await mockUserProfileAPI(page);
        await mockUserFilesAPI(page);
        await mockProjectsAPI(page);
        await mockPackagesAPI(page, []);
        await mockAddPackageAPI(page);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);
        await waitForFiles(page);
    });

    test("+ button in Packages header opens Add Package dialog", async ({
        page,
    }) => {
        // The + button next to "Packages" header (has title="Add Package")
        const addBtn = page.locator('button[title="Add Package"]');
        await expect(addBtn).toBeVisible({ timeout: 10_000 });
        await addBtn.click();

        await expect(page.locator("text=Add Package").first()).toBeVisible({
        timeout: 5_000,
        });

        await expect(page.locator('input[placeholder="numpy"]')).toBeVisible();
    });

    test("Add button is disabled when input is empty", async ({ page }) => {
        const addBtn = page.locator('button[title="Add Package"]');
        await addBtn.click();

        await expect(page.locator("text=Add Package").first()).toBeVisible({
        timeout: 5_000,
        });

        // The "Add" button inside the dialog
        const submitBtn = page.locator(
        'button:has-text("Add"):not([title="Add Package"])',
        );
        await expect(submitBtn).toBeDisabled();
    });

    test("typing a package name enables the Add button", async ({ page }) => {
        const addBtn = page.locator('button[title="Add Package"]');
        await addBtn.click();

        await expect(page.locator("text=Add Package").first()).toBeVisible({
        timeout: 5_000,
        });

        await page.locator('input[placeholder="numpy"]').fill("pandas");

        const submitBtn = page.locator(
        'button:has-text("Add"):not([title="Add Package"])',
        );
        await expect(submitBtn).toBeEnabled();
    });

    test("Cancel closes the dialog", async ({ page }) => {
        const addBtn = page.locator('button[title="Add Package"]');
        await addBtn.click();

        await expect(page.locator("text=Add Package").first()).toBeVisible({
        timeout: 5_000,
        });

        await page.locator('button:has-text("Cancel")').click();

        await expect(page.locator("text=Add Package").first()).not.toBeVisible({
        timeout: 5_000,
        });
    });

    test("submitting calls the add package API", async ({ page }) => {
        let addCalled = false;
        let sentPackageName = "";
        await page.route("**/api/packages/create", (route, request) => {
        if (request.method() === "POST") {
            addCalled = true;
            const body = JSON.parse(request.postData() || "{}");
            sentPackageName = body.packageName;
            return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                id: 100,
                packageName: body.packageName,
                projectId: body.projectId || 1,
                clerkId: "user_test123",
            }),
            });
        }
        return route.continue();
        });

        const addBtn = page.locator('button[title="Add Package"]');
        await addBtn.click();

        await expect(page.locator("text=Add Package").first()).toBeVisible({
        timeout: 5_000,
        });

        await page.locator('input[placeholder="numpy"]').fill("matplotlib");

        const submitBtn = page.locator(
        'button:has-text("Add"):not([title="Add Package"])',
        );
        await submitBtn.click();

        // Dialog should close
        await expect(page.locator("text=Add Package").first()).not.toBeVisible({
        timeout: 5_000,
        });

        expect(addCalled).toBe(true);
        expect(sentPackageName).toBe("matplotlib");
    });

    test("pressing Enter in the input submits", async ({ page }) => {
        let addCalled = false;
        await page.route("**/api/packages/create", (route, request) => {
            if (request.method() === "POST") {
                addCalled = true;
                const body = JSON.parse(request.postData() || "{}");
                return route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        id: 100,
                        packageName: body.packageName,
                        projectId: 1,
                        clerkId: "user_test123",
                    }),
                });
            }
            return route.continue();
        });

        const addBtn = page.locator('button[title="Add Package"]');
        await addBtn.click();

        await expect(page.locator("text=Add Package").first()).toBeVisible({
            timeout: 5_000,
        });

        const input = page.locator('input[placeholder="numpy"]');
        await input.fill("scipy");
        await input.press("Enter");

        await expect(page.locator("text=Add Package").first()).not.toBeVisible({
            timeout: 5_000,
        });

        expect(addCalled).toBe(true);
    });
});

test.describe("Package management — remove package", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        await mockUserProfileAPI(page);
        await mockUserFilesAPI(page);
        await mockProjectsAPI(page);
        await mockPackagesAPI(page);
        await mockDeletePackageAPI(page);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);
        await waitForFiles(page);
    });

    test("hovering a package reveals the trash icon", async ({ page }) => {
        // Find the numpy package row
        const numpyRow = page.locator("text=numpy").first().locator("..");
        await expect(numpyRow).toBeVisible({ timeout: 10_000 });

        await numpyRow.hover();

        // Trash icon inside the row should become visible
        const trashBtn = numpyRow.locator("svg.lucide-trash-2").first();
        await expect(trashBtn).toBeVisible({ timeout: 3_000 });
    });

    test("clicking trash calls delete package API", async ({ page }) => {
        let deleteCalled = false;
        await page.route("**/api/packages/*", (route, request) => {
        if (request.method() === "DELETE") {
            deleteCalled = true;
            return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
            });
        }
        return route.continue();
        });

        const numpyRow = page.locator("text=numpy").first().locator("..");
        await numpyRow.hover();

        const trashBtn = numpyRow.locator("svg.lucide-trash-2").first();
        await trashBtn.click();

        // Give the mutation time to fire
        await page.waitForTimeout(1_000);
        expect(deleteCalled).toBe(true);
    });

    test("helper text shows PyPI hint in the dialog", async ({ page }) => {
        const addBtn = page.locator('button[title="Add Package"]');
        await addBtn.click();

        await expect(
        page.locator("text=Enter a PyPI package name").first(),
        ).toBeVisible({ timeout: 5_000 });
    });
});
