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

/**
 * Perform a full drag-drop sequence via synthetic DragEvents.
 * Bypasses vite-error-overlay since it doesn't use real pointer events.
 */
async function syntheticDragDrop(
    page: import("@playwright/test").Page,
    sourceText: string,
    targetSelector: { text: string; closest?: string },
    ) {
    await page.evaluate(
        ({ sourceText, targetSelector }) => {
            // Find the source element (draggable file row)
            const source = [...document.querySelectorAll('[draggable="true"]')].find(
                (el) => el.textContent?.includes(sourceText),
            );
            if (!source) throw new Error(`Source "${sourceText}" not found`);

            // Find the target element
            let target: Element | null = null;
            const candidates = document.querySelectorAll("*");
            for (const el of candidates) {
                // Match direct text content in a span.font-medium or span.truncate
                const spans = el.querySelectorAll(".font-medium, .truncate");
                for (const span of spans) {
                    if (span.textContent?.trim() === targetSelector.text) {
                        target = targetSelector.closest
                        ? span.closest(targetSelector.closest)
                        : span.closest(".group") || el;
                        break;
                    }
                }
                if (target) break;
            }
            if (!target) throw new Error(`Target "${targetSelector.text}" not found`);

            const dt = new DataTransfer();
            dt.setData("text/plain", sourceText);

            source.dispatchEvent(
                new DragEvent("dragstart", {
                bubbles: true,
                cancelable: true,
                dataTransfer: dt,
                }),
            );

            target.dispatchEvent(
                new DragEvent("dragover", {
                bubbles: true,
                cancelable: true,
                dataTransfer: dt,
                }),
            );

            target.dispatchEvent(
                new DragEvent("drop", {
                bubbles: true,
                cancelable: true,
                dataTransfer: dt,
                }),
            );

            source.dispatchEvent(new DragEvent("dragend", { bubbles: true }));
        },
        { sourceText, targetSelector },
    );
}

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

        await syntheticDragDrop(page, "solo.py", { text: "My Project" });

        await page.waitForTimeout(2_000);
        expect(moveCalled).toBe(true);
        expect(sentBody?.projectId).toBe(1);
    });

    test("project auto-expands after drop", async ({ page }) => {
        const secondProject = page.locator("text=Second Project").first();
        await expect(secondProject).toBeVisible({ timeout: 10_000 });

        await syntheticDragDrop(page, "solo.py", { text: "Second Project" });

        // After drop, the project should auto-expand — folder-open icon appears
        await expect(page.locator("svg.lucide-folder-open").first()).toBeVisible({
            timeout: 5_000,
        });
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

        // Drag app.py to the root drop zone by targeting a loose file
        await syntheticDragDrop(page, "app.py", {
            text: "solo.py",
            closest: ".overflow-y-auto",
        });

        await page.waitForTimeout(2_000);
        expect(moveCalled).toBe(true);
        expect(sentBody?.projectId).toBeNull();
    });

    test("dragged file appears semi-transparent during drag", async ({
        page,
    }) => {
        const soloFile = page.locator("text=solo.py").first();
        await expect(soloFile).toBeVisible({ timeout: 10_000 });

        // Dispatch only dragstart (no drop/dragend) so the drag state persists
        await page.evaluate(() => {
            const el = [...document.querySelectorAll('[draggable="true"]')].find(
                (e) => e.textContent?.includes("solo.py"),
            );
            if (el) {
                const dt = new DataTransfer();
                dt.setData("text/plain", "103");
                el.dispatchEvent(
                new DragEvent("dragstart", {
                    bubbles: true,
                    cancelable: true,
                    dataTransfer: dt,
                }),
                );
            }
        });

        const soloRow = soloFile.locator("..");
        await expect(soloRow).toHaveClass(/opacity-40/, { timeout: 3_000 });

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

    test("drop target highlights with blue ring on dragover", async ({
        page,
    }) => {
        const soloFile = page.locator("text=solo.py").first();
        await expect(soloFile).toBeVisible({ timeout: 10_000 });

        const projectRow = page.locator("text=My Project").first();
        await expect(projectRow).toBeVisible({ timeout: 10_000 });

        // Dispatch dragstart on solo.py, then dragover on the project row
        // (but NO drop or dragend, so the highlight state persists)
        await page.evaluate(() => {
            const source = [...document.querySelectorAll('[draggable="true"]')].find(
                (e) => e.textContent?.includes("solo.py"),
            );
            if (!source) throw new Error("source not found");

            const dt = new DataTransfer();
            dt.setData("text/plain", "103");

            source.dispatchEvent(
                new DragEvent("dragstart", {
                bubbles: true,
                cancelable: true,
                dataTransfer: dt,
                }),
            );

            // Find the project row element that has the onDragOver handler
            const projectSpan = [...document.querySelectorAll(".font-medium")].find(
                (e) => e.textContent?.trim() === "My Project",
            );
            const projectEl = projectSpan?.closest(".group");
            if (!projectEl) throw new Error("project element not found");

            projectEl.dispatchEvent(
                new DragEvent("dragover", {
                    bubbles: true,
                    cancelable: true,
                    dataTransfer: dt,
                }),
            );
        });

        // The project row itself (not parent) should have the highlight
        const projectGroup = projectRow.locator("..");
        await expect(projectGroup).toHaveClass(/bg-blue-500/, { timeout: 3_000 });

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
