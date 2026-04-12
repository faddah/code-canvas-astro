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
    mockUpdateFileAPI,
} from "./helpers";

/** Dispatch dragstart on a file row matching the given text */
async function dispatchDragStart(
    page: import("@playwright/test").Page,
    fileText: string,
    ) {
    await page.evaluate((text) => {
        const el = [...document.querySelectorAll('[draggable="true"]')].find((e) =>
            e.textContent?.includes(text),
        );
        if (!el) throw new Error(`Draggable "${text}" not found`);
        const dt = new DataTransfer();
        dt.setData("text/plain", text);
        el.dispatchEvent(
            new DragEvent("dragstart", {
                bubbles: true,
                cancelable: true,
                dataTransfer: dt,
            }),
        );
    }, fileText);
}

    /** Dispatch dragover on a project row matching the given text */
async function dispatchDragOverProject(
    page: import("@playwright/test").Page,
    projectName: string,
    ) {
    await page.evaluate((name) => {
        const span = [...document.querySelectorAll(".font-medium")].find(
            (e) => e.textContent?.trim() === name,
        );
        const el = span?.closest(".group");
        if (!el) throw new Error(`Project "${name}" not found`);
        const dt = new DataTransfer();
        dt.dropEffect = "move";
        el.dispatchEvent(
            new DragEvent("dragover", {
                bubbles: true,
                cancelable: true,
                dataTransfer: dt,
            }),
        );
    }, projectName);
}

/** Dispatch drop on a project row matching the given text */
async function dispatchDropOnProject(
    page: import("@playwright/test").Page,
    projectName: string,
    ) {
    await page.evaluate((name) => {
        const span = [...document.querySelectorAll(".font-medium")].find(
            (e) => e.textContent?.trim() === name,
        );
        const el = span?.closest(".group");
        if (!el) throw new Error(`Project "${name}" not found`);
        const dt = new DataTransfer();
        el.dispatchEvent(
            new DragEvent("drop", {
                bubbles: true,
                cancelable: true,
                dataTransfer: dt,
            }),
        );
    }, projectName);
}

    /** Dispatch drop on the root file list (the scrollable container) */
async function dispatchDropOnRoot(page: import("@playwright/test").Page) {
    await page.evaluate(() => {
        const el = document.querySelector(".overflow-y-auto");
        if (!el) throw new Error("Root drop zone not found");
        const dt = new DataTransfer();
        el.dispatchEvent(
            new DragEvent("drop", {
                bubbles: true,
                cancelable: true,
                dataTransfer: dt,
            }),
        );
    });
}

    /** Dispatch dragend on a file row matching the given text */
async function dispatchDragEnd(
    page: import("@playwright/test").Page,
    fileText: string,
    ) {
    await page.evaluate((text) => {
        const el = [...document.querySelectorAll('[draggable="true"]')].find((e) =>
            e.textContent?.includes(text),
        );
        if (el) {
            el.dispatchEvent(new DragEvent("dragend", { bubbles: true }));
        }
    }, fileText);
1}

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
        await dismissViteOverlay(page);
    });

    test("loose file has a drag handle visible on hover", async ({ page }) => {
        const soloRow = page.locator("text=solo.py").first().locator("..");
        await expect(soloRow).toBeVisible({ timeout: 10_000 });

        const grip = soloRow.locator("svg.lucide-grip-vertical");
        await expect(grip).toBeAttached();

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

        // Step 1: dragstart — sets draggedFileId in React state
        await dispatchDragStart(page, "solo.py");
        // Wait for React to commit the state update
        await page.waitForTimeout(200);

        // Step 2: dragover + drop — reads draggedFileId, calls onMoveFile
        await dispatchDragOverProject(page, "My Project");
        await dispatchDropOnProject(page, "My Project");
        await dispatchDragEnd(page, "solo.py");

        // Wait for the React Query mutation to fire
        await page.waitForTimeout(2_000);
        expect(moveCalled).toBe(true);
        expect(sentBody?.projectId).toBe(1);
    });

    test("project auto-expands after drop", async ({ page }) => {
        const secondProject = page.locator("text=Second Project").first();
        await expect(secondProject).toBeVisible({ timeout: 10_000 });

        await dispatchDragStart(page, "solo.py");
        await page.waitForTimeout(200);
        await dispatchDragOverProject(page, "Second Project");
        await dispatchDropOnProject(page, "Second Project");
        await dispatchDragEnd(page, "solo.py");

        // After drop, the project should auto-expand
        // Check for folder-open icon WITHIN the Second Project row (not the header button)
        const projectRow = secondProject.locator("..");
        await expect(
            projectRow.locator("svg.lucide-folder-open").first(),
        ).toBeVisible({ timeout: 5_000 });
    });

    test("dragging a project file to root removes it from the project", async ({
        page,
    }) => {
        // First expand "My Project" to see its files
        const myProject = page.locator("text=My Project").first();
        await myProject.click();

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

        // Step 1: dragstart on app.py
        await dispatchDragStart(page, "app.py");
        await page.waitForTimeout(200);

        // Step 2: drop on root zone
        await dispatchDropOnRoot(page);
        await dispatchDragEnd(page, "app.py");

        await page.waitForTimeout(2_000);
        expect(moveCalled).toBe(true);
        expect(sentBody?.projectId).toBeNull();
    });

    test("dragged file appears semi-transparent during drag", async ({
        page,
    }) => {
        const soloFile = page.locator("text=solo.py").first();
        await expect(soloFile).toBeVisible({ timeout: 10_000 });

        await dispatchDragStart(page, "solo.py");

        const soloRow = soloFile.locator("..");
        await expect(soloRow).toHaveClass(/opacity-40/, { timeout: 3_000 });

        await dispatchDragEnd(page, "solo.py");
    });

    test("drop target highlights on dragover", async ({ page }) => {
        const soloFile = page.locator("text=solo.py").first();
        await expect(soloFile).toBeVisible({ timeout: 10_000 });

        const projectRow = page.locator("text=My Project").first();
        await expect(projectRow).toBeVisible({ timeout: 10_000 });

        // Step 1: dragstart
        await dispatchDragStart(page, "solo.py");
        await page.waitForTimeout(200);

        // Step 2: dragover on project
        await dispatchDragOverProject(page, "My Project");

        // The project row's parent div gets the highlight class
        const projectGroup = projectRow.locator("..");
        await expect(projectGroup).toHaveClass(/bg-blue-500/, { timeout: 3_000 });

        await dispatchDragEnd(page, "solo.py");
    });
});
