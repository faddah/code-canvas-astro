import { test, expect } from "./fixtures/authenticated";
import {
    blockPyodide,
    waitForIDEShell,
    waitForFiles,
    mockUserProfileAPI,
    mockUserFilesAPI,
    mockProjectsAPI,
    mockPackagesAPI,
    mockUpdateFileAPI,
    MOCK_PROJECTS,
    MOCK_USER_FILES,
} from "./helpers";

test.describe("File drag-and-drop between projects", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        await mockUserProfileAPI(page);
        await mockUserFilesAPI(page);
        await mockProjectsAPI(page);
        await mockUpdateFileAPI(page);
        await mockPackagesAPI(page, []);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);
        await waitForFiles(page);
    });

    test("loose file has a drag handle visible on hover", async ({ page }) => {
        // solo.py is a loose file (no project)
        const soloRow = page.locator("text=solo.py").first().locator("..");
        await expect(soloRow).toBeVisible({ timeout: 10_000 });

        // The GripVertical icon is hidden by default (opacity-0)
        const grip = soloRow.locator("svg.lucide-grip-vertical");
        await expect(grip).toBeAttached();

        // Hover to reveal it
        await soloRow.hover();
        await expect(grip).toBeVisible({ timeout: 3_000 });
    });

    test("dragging a loose file to a project calls move API", async ({
        page,
    }) => {
        let moveCalled = false;
        let sentBody: any = null;
        await page.route("**/api/user-files/*", (route, request) => {
            if (request.method() === "PUT") {
                moveCalled = true;
                sentBody = JSON.parse(request.postData() || "{}");
                return route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({ id: 103, ...sentBody }),
                });
            }
            return route.continue();
        });

        // solo.py is loose (projectId: null)
        const soloFile = page.locator("text=solo.py").first();
        await expect(soloFile).toBeVisible({ timeout: 10_000 });

        // "My Project" is project id=1
        const projectRow = page.locator("text=My Project").first();
        await expect(projectRow).toBeVisible({ timeout: 10_000 });

        // Drag solo.py onto "My Project"
        await soloFile.dragTo(projectRow);

        // Wait for the mutation to fire
        await page.waitForTimeout(2_000);
        expect(moveCalled).toBe(true);
        expect(sentBody?.projectId).toBe(1);
    });

    test("project auto-expands after drop", async ({ page }) => {
        // "Second Project" starts collapsed — its files shouldn't be visible
        const secondProject = page.locator("text=Second Project").first();
        await expect(secondProject).toBeVisible({ timeout: 10_000 });

        // Drag solo.py onto Second Project
        const soloFile = page.locator("text=solo.py").first();
        await soloFile.dragTo(secondProject);

        // After drop, the project should auto-expand
        // The expanded project shows an open folder icon
        await expect(
            secondProject.locator("..").locator("svg.lucide-folder-open").first(),
        ).toBeVisible({ timeout: 5_000 });
    });

    test("dragging a project file to root removes it from the project", async ({
        page,
    }) => {
        // First expand "My Project" to see its files
        const myProject = page.locator("text=My Project").first();
        await myProject.click();

        // app.py should appear (it's in project 1)
        const appFile = page.locator("text=app.py").first();
        await expect(appFile).toBeVisible({ timeout: 5_000 });

        let moveCalled = false;
        let sentBody: any = null;
        await page.route("**/api/user-files/*", (route, request) => {
            if (request.method() === "PUT") {
                moveCalled = true;
                sentBody = JSON.parse(request.postData() || "{}");
                return route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({ id: 101, ...sentBody }),
                });
            }
            return route.continue();
        });

        // The root drop zone is the file list container
        // Drag app.py to the loose file "solo.py" area (the root zone)
        const soloFile = page.locator("text=solo.py").first();
        await appFile.dragTo(soloFile);

        await page.waitForTimeout(2_000);
        expect(moveCalled).toBe(true);
        expect(sentBody?.projectId).toBeNull();
    });

    test("dragged file appears semi-transparent during drag", async ({
        page,
    }) => {
        const soloFile = page.locator("text=solo.py").first();
        await expect(soloFile).toBeVisible({ timeout: 10_000 });

        // Dispatch a synthetic dragstart on the file row
        await page.evaluate(() => {
            const el = [...document.querySelectorAll('[draggable="true"]')].find(
                (e) => e.textContent?.includes("solo.py"),
            );
            if (el) {
                const dt = new DataTransfer();
                dt.setData("text/plain", "103");
                el.dispatchEvent(
                    new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }),
                );
            }
        });

        // The dragged row should have opacity-40 class
        const soloRow = soloFile.locator("..");
        await expect(soloRow).toHaveClass(/opacity-40/, { timeout: 3_000 });

        // Clean up: dispatch dragend
        await page.evaluate(() => {
            const el = [...document.querySelectorAll('[draggable="true"]')].find(
                (e) => e.textContent?.includes("solo.py"),
            );
            if (el) {
                el.dispatchEvent(new DragEvent("dragend", { bubbles: true }));
            }
        });
    });

    test("drop target highlights with blue ring on dragover", async ({
        page,
    }) => {
        const soloFile = page.locator("text=solo.py").first();
        await expect(soloFile).toBeVisible({ timeout: 10_000 });

        const projectRow = page.locator("text=My Project").first();
        await expect(projectRow).toBeVisible({ timeout: 10_000 });

        // Step 1: dispatch dragstart on solo.py
        await page.evaluate(() => {
            const el = [...document.querySelectorAll('[draggable="true"]')].find(
                (e) => e.textContent?.includes("solo.py"),
            );
            if (el) {
                const dt = new DataTransfer();
                dt.setData("text/plain", "103");
                el.dispatchEvent(
                    new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }),
                );
            }
        });

        // Step 2: dispatch dragover on the "My Project" row
        await page.evaluate(() => {
            const el = [...document.querySelectorAll(".font-medium")]
                .find((e) => e.textContent?.includes("My Project"))
                ?.closest(".group");
            if (el) {
                const dt = new DataTransfer();
                dt.dropEffect = "move";
                el.dispatchEvent(
                new DragEvent("dragover", {
                    bubbles: true,
                    cancelable: true,
                    dataTransfer: dt,
                }),
                );
            }
        });

        // The project row's parent should have the highlight class
        const projectGroup = projectRow.locator("..");
        await expect(projectGroup).toHaveClass(/ring-blue-500/, { timeout: 3_000 });

        // Clean up
        await page.evaluate(() => {
            const el = [...document.querySelectorAll('[draggable="true"]')].find(
                (e) => e.textContent?.includes("solo.py"),
            );
            if (el) {
                el.dispatchEvent(new DragEvent("dragend", { bubbles: true }));
            }
        });
    });
});
