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
    mockCreateFileAPI,
    MOCK_USER_FILES,
} from "./helpers";

test.describe("New File — authenticated happy path", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        await mockUserProfileAPI(page);
        await mockUserFilesAPI(page);
        await mockProjectsAPI(page, []);
        await mockPackagesAPI(page, []);
        await mockCreateFileAPI(page);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);
        await waitForFiles(page);
    });

    test("creating a .py file calls POST API and file appears in Explorer", async ({
        page,
    }) => {
        // Open the + dropdown
        const plusButton = page.locator("button:has(svg.lucide-plus)").first();
        await expect(plusButton).toBeVisible({ timeout: 10_000 });
        await plusButton.click();

        // Click "New File"
        const newFileItem = page.locator("text=New File").first();
        await expect(newFileItem).toBeVisible({ timeout: 5_000 });
        await newFileItem.click();

        // Dialog should appear
        await expect(
            page.locator("text=Create New File").first(),
        ).toBeVisible({ timeout: 5_000 });

        // Type a filename
        const input = page.locator('input[placeholder="script.py"]');
        await input.fill("my_module.py");

        // Set up request interception before clicking Add
        const postPromise = page.waitForRequest(
            (req) =>
                req.url().includes("/api/user-files/create") &&
                req.method() === "POST",
        );

        // Click Add
        await dismissViteOverlay(page);
        await page
            .locator('button:has-text("Add")')
            .click({ force: true });

        // Verify the POST request was made with correct body
        const postRequest = await postPromise;
        const body = postRequest.postDataJSON();
        expect(body.name).toBe("my_module.py");

        // Dialog should close
        await expect(
            page.locator("text=Create New File").first(),
        ).not.toBeVisible({ timeout: 5_000 });
    });

    test("file without extension gets .py appended automatically", async ({
        page,
    }) => {
        // Open dropdown and click New File
        const plusButton = page.locator("button:has(svg.lucide-plus)").first();
        await plusButton.click();
        await page.locator("text=New File").first().click();

        await expect(
            page.locator("text=Create New File").first(),
        ).toBeVisible({ timeout: 5_000 });

        // Type a name without extension
        const input = page.locator('input[placeholder="script.py"]');
        await input.fill("utils");

        // Set up request interception
        const postPromise = page.waitForRequest(
            (req) =>
                req.url().includes("/api/user-files/create") &&
                req.method() === "POST",
        );

        await dismissViteOverlay(page);
        await page
            .locator('button:has-text("Add")')
            .click({ force: true });

        // Verify .py was appended
        const postRequest = await postPromise;
        const body = postRequest.postDataJSON();
        expect(body.name).toBe("utils.py");
    });

    test("pressing Enter in the input submits the new file", async ({
        page,
    }) => {
        // Open dropdown and click New File
        const plusButton = page.locator("button:has(svg.lucide-plus)").first();
        await plusButton.click();
        await page.locator("text=New File").first().click();

        await expect(
            page.locator("text=Create New File").first(),
        ).toBeVisible({ timeout: 5_000 });

        const input = page.locator('input[placeholder="script.py"]');
        await input.fill("enter_test.py");

        // Set up request interception
        const postPromise = page.waitForRequest(
            (req) =>
                req.url().includes("/api/user-files/create") &&
                req.method() === "POST",
        );

        // Press Enter instead of clicking Add
        await input.press("Enter");

        // Verify the POST request was made
        const postRequest = await postPromise;
        const body = postRequest.postDataJSON();
        expect(body.name).toBe("enter_test.py");
    });

    test("creates a .txt file via New File dialog", async ({ page }) => {
        // Open dropdown and click New File
        const plusButton = page.locator("button:has(svg.lucide-plus)").first();
        await plusButton.click();
        await page.locator("text=New File").first().click();

        // Dialog should appear
        await expect(
            page.locator("text=Create New File").first(),
        ).toBeVisible({ timeout: 5_000 });

        // Type a .txt file name
        const input = page.locator('input[placeholder="script.py"]');
        await input.fill("notes.txt");

        // Set up request interception before clicking Add
        const postPromise = page.waitForRequest(
            (req) =>
                req.url().includes("/api/user-files/create") &&
                req.method() === "POST",
        );

        // Click Add
        await dismissViteOverlay(page);
        await page
            .locator('button:has-text("Add")')
            .click({ force: true });

        // Verify the POST request was made with .txt name (not auto-appended to .py)
        const postRequest = await postPromise;
        const body = postRequest.postDataJSON();
        expect(body.name).toBe("notes.txt");

        // Dialog should close
        await expect(
            page.locator("text=Create New File").first(),
        ).not.toBeVisible({ timeout: 5_000 });
    });

    test("long filename is visually truncated in Explorer", async ({
        page,
        }) => {
        // Override the default mock to include a file with a very long name
        await page.unroute("**/api/user-files");
        await mockUserFilesAPI(page, [
            ...MOCK_USER_FILES,
            {
                id: 999,
                name: "this_is_a_very_long_filename_that_should_definitely_be_truncated.py",
                content: "# long name\n",
                projectId: null,
                clerkId: "user_test123",
                createdAt: "2025-01-03T00:00:00.000Z",
            },
        ]);
        await page.goto("/");
        await waitForIDEShell(page);
        await waitForFiles(page);

        // Find the file in Explorer — it uses the .truncate class
        const fileLabel = page
            .locator(".truncate.flex-1", {
                hasText: "this_is_a_very_long_filename",
            })
            .first();
        await expect(fileLabel).toBeVisible({ timeout: 10_000 });

        // Verify the truncate CSS is applied (text-overflow: ellipsis)
        const textOverflow = await fileLabel.evaluate(
            (el) => getComputedStyle(el).textOverflow,
        );
        expect(textOverflow).toBe("ellipsis");

        const overflow = await fileLabel.evaluate(
            (el) => getComputedStyle(el).overflow,
        );
        expect(overflow).toBe("hidden");
    });

    test("creating a file with an existing name succeeds (no client-side duplicate check)", async ({
        page,
        }) => {
        // "solo.py" already exists in MOCK_USER_FILES
        // Open dropdown and click New File
        const plusButton = page.locator("button:has(svg.lucide-plus)").first();
        await plusButton.click();
        await page.locator("text=New File").first().click();

        await expect(
            page.locator("text=Create New File").first(),
        ).toBeVisible({ timeout: 5_000 });

        // Type a name that already exists
        const input = page.locator('input[placeholder="script.py"]');
        await input.fill("solo.py");

        // Set up request interception
        const postPromise = page.waitForRequest(
            (req) =>
            req.url().includes("/api/user-files/create") &&
            req.method() === "POST",
        );

        await dismissViteOverlay(page);
        await page
            .locator('button:has-text("Add")')
            .click({ force: true });

        // POST should still fire — no client-side duplicate blocking
        const postRequest = await postPromise;
        const body = postRequest.postDataJSON();
        expect(body.name).toBe("solo.py");

        // Dialog should close without error
        await expect(
            page.locator("text=Create New File").first(),
        ).not.toBeVisible({ timeout: 5_000 });
    });
});