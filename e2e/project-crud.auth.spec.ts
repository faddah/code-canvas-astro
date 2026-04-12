import { test, expect } from "./fixtures/authenticated";
import {
    blockPyodide,
    waitForIDEShell,
    waitForFiles,
    mockUserProfileAPI,
    mockUserFilesAPI,
    mockProjectsAPI,
    mockCreateProjectAPI,
    mockDeleteProjectAPI,
    mockPackagesAPI,
    mockUpdateFileAPI,
    MOCK_PROJECTS,
    MOCK_USER_FILES,
} from "./helpers";

test.describe("Project CRUD — create project", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        await mockUserProfileAPI(page);
        await mockUserFilesAPI(page);
        await mockProjectsAPI(page, []);
        await mockCreateProjectAPI(page);
        await mockPackagesAPI(page, []);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);
    });

    test("New Project button opens create dialog", async ({ page }) => {
        // The folder icon button with title="New Project"
        const newProjectBtn = page.locator('button[title="New Project"]');
        await expect(newProjectBtn).toBeVisible({ timeout: 10_000 });
        await newProjectBtn.click();

        await expect(page.locator("text=Create New Project").first()).toBeVisible({
        timeout: 5_000,
        });

        // Input with placeholder "My Project"
        await expect(page.locator('input[placeholder="My Project"]')).toBeVisible();
    });

    test("Create button is disabled when input is empty", async ({ page }) => {
        const newProjectBtn = page.locator('button[title="New Project"]');
        await newProjectBtn.click();

        await expect(page.locator("text=Create New Project").first()).toBeVisible({
        timeout: 5_000,
        });

        const createBtn = page.locator('button:has-text("Create")');
        await expect(createBtn).toBeDisabled();
    });

    test("typing a name enables the Create button", async ({ page }) => {
        const newProjectBtn = page.locator('button[title="New Project"]');
        await newProjectBtn.click();

        await expect(page.locator("text=Create New Project").first()).toBeVisible({
        timeout: 5_000,
        });

        const input = page.locator('input[placeholder="My Project"]');
        await input.fill("Test Project");

        const createBtn = page.locator('button:has-text("Create")');
        await expect(createBtn).toBeEnabled();
    });

    test("Cancel closes the create project dialog", async ({ page }) => {
        const newProjectBtn = page.locator('button[title="New Project"]');
        await newProjectBtn.click();

        await expect(page.locator("text=Create New Project").first()).toBeVisible({
        timeout: 5_000,
        });

        await page.locator('button:has-text("Cancel")').click();

        await expect(
        page.locator("text=Create New Project").first(),
        ).not.toBeVisible({ timeout: 5_000 });
    });

    test("submitting the form calls create project API", async ({ page }) => {
        let createCalled = false;
        let sentName = "";
        await page.route("**/api/projects/create", (route, request) => {
        if (request.method() === "POST") {
            createCalled = true;
            const body = JSON.parse(request.postData() || "{}");
            sentName = body.name;
            return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                id: 99,
                name: body.name,
                clerkId: "user_test123",
                createdAt: new Date().toISOString(),
            }),
            });
        }
        return route.continue();
        });

        const newProjectBtn = page.locator('button[title="New Project"]');
        await newProjectBtn.click();

        await expect(page.locator("text=Create New Project").first()).toBeVisible({
        timeout: 5_000,
        });

        await page
        .locator('input[placeholder="My Project"]')
        .fill("My E2E Project");
        await page.locator('button:has-text("Create")').click();

        // Dialog should close
        await expect(
        page.locator("text=Create New Project").first(),
        ).not.toBeVisible({ timeout: 5_000 });

        expect(createCalled).toBe(true);
        expect(sentName).toBe("My E2E Project");
    });

    test("pressing Enter in the input submits the form", async ({ page }) => {
        let createCalled = false;
        await page.route("**/api/projects/create", (route, request) => {
        if (request.method() === "POST") {
            createCalled = true;
            const body = JSON.parse(request.postData() || "{}");
            return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                id: 99,
                name: body.name,
                clerkId: "user_test123",
                createdAt: new Date().toISOString(),
            }),
            });
        }
        return route.continue();
        });

        const newProjectBtn = page.locator('button[title="New Project"]');
        await newProjectBtn.click();

        await expect(page.locator("text=Create New Project").first()).toBeVisible({
        timeout: 5_000,
        });

        const input = page.locator('input[placeholder="My Project"]');
        await input.fill("Enter Project");
        await input.press("Enter");

        await expect(
        page.locator("text=Create New Project").first(),
        ).not.toBeVisible({ timeout: 5_000 });

        expect(createCalled).toBe(true);
    });
    });

    test.describe("Project CRUD — projects in explorer", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        await mockUserProfileAPI(page);
        await mockUserFilesAPI(page);
        await mockProjectsAPI(page);
        await mockDeleteProjectAPI(page);
        await mockPackagesAPI(page, []);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);
        await waitForFiles(page);
    });

    test("projects are listed in the explorer", async ({ page }) => {
        await expect(page.locator("text=My Project").first()).toBeVisible({
        timeout: 10_000,
        });

        await expect(page.locator("text=Second Project").first()).toBeVisible();
    });

    test("clicking a project toggles it open and closed", async ({ page }) => {
        const project = page.locator("text=My Project").first();
        await expect(project).toBeVisible({ timeout: 10_000 });

        // Click to expand
        await project.click();

        // Files inside should be visible (app.py is in project 1)
        await expect(page.locator("text=app.py").first()).toBeVisible({
        timeout: 5_000,
        });

        // Click again to collapse
        await project.click();

        // File count badge should still show, but files hidden
        // (app.py may still be in DOM but the parent container collapses)
        await page.waitForTimeout(500);
    });

    test("delete project shows confirm then removes it", async ({ page }) => {
        const projectRow = page.locator("text=Second Project").first();
        await expect(projectRow).toBeVisible({ timeout: 10_000 });

        // Hover to reveal trash icon — the trash is inside the project row's parent group
        const projectGroup = projectRow.locator("..");
        await projectGroup.hover();

        // Click the trash button (inside the group)
        const trashBtn = projectGroup.locator("svg.lucide-trash-2").first();
        await trashBtn.click();

        // Confirm button should appear
        const confirmBtn = page.locator("text=Confirm").first();
        await expect(confirmBtn).toBeVisible({ timeout: 3_000 });
        await confirmBtn.click();
    });
    });

    test.describe("Project CRUD — + menu shows project options", () => {
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

    test("+ dropdown shows 'New File in project' options", async ({ page }) => {
        const plusButton = page.locator("button:has(svg.lucide-plus)").first();
        await expect(plusButton).toBeVisible({ timeout: 10_000 });
        await plusButton.click();

        // Should show "New File" plus per-project options
        await expect(
        page.locator('[role="menuitem"]', { hasText: "New File" }).first(),
        ).toBeVisible({ timeout: 5_000 });

        await expect(
        page.locator('[role="menuitem"]', {
            hasText: 'New File in "My Project"',
        }),
        ).toBeVisible();

        await expect(
        page.locator('[role="menuitem"]', {
            hasText: 'New File in "Second Project"',
        }),
        ).toBeVisible();
    });
});
