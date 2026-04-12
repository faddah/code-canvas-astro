import { test, expect } from "@playwright/test";
import {
    blockPyodide,
    mockStarterFilesAPI,
    waitForIDEShell,
} from "./helpers";

test.describe("Panel resizing via drag handles", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        await mockStarterFilesAPI(page);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);
    });

    test("horizontal drag handle resizes editor and execution panels", async ({
        page,
    }) => {
        // Find the horizontal resize handle (col-resize cursor)
        const handle = page.locator("[data-panel-resize-handle-id]").first();
        await expect(handle).toBeVisible({ timeout: 10_000 });

        // Get the editor panel width before drag
        const editorBefore = await page
            .locator("[data-panel-id]")
            .first()
            .boundingBox();
        expect(editorBefore).not.toBeNull();

        // Get handle position
        const handleBox = await handle.boundingBox();
        expect(handleBox).not.toBeNull();

        // Drag the handle 150px to the right
        const startX = handleBox!.x + handleBox!.width / 2;
        const startY = handleBox!.y + handleBox!.height / 2;
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX + 150, startY, { steps: 10 });
        await page.mouse.up();

        // Get the editor panel width after drag
        const editorAfter = await page
            .locator("[data-panel-id]")
            .first()
            .boundingBox();
        expect(editorAfter).not.toBeNull();

        // Editor should be wider after dragging right
        expect(editorAfter!.width).toBeGreaterThan(editorBefore!.width + 50);
    });

    test("vertical drag handle resizes preview and console panels", async ({
        page,
    }) => {
        // The vertical handle is the second resize handle on the page
        const handles = page.locator("[data-panel-resize-handle-id]");
        const verticalHandle = handles.nth(1);
        await expect(verticalHandle).toBeVisible({ timeout: 10_000 });

        // Get the console panel bounding box before drag
        // Console is the last panel in the vertical group
        const panels = page.locator("[data-panel-id]");
        const panelCount = await panels.count();
        const consolePanelBefore = await panels.nth(panelCount - 1).boundingBox();
        expect(consolePanelBefore).not.toBeNull();

        // Get handle position
        const handleBox = await verticalHandle.boundingBox();
        expect(handleBox).not.toBeNull();

        // Drag the handle 80px upward (makes console taller)
        const startX = handleBox!.x + handleBox!.width / 2;
        const startY = handleBox!.y + handleBox!.height / 2;
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, startY - 80, { steps: 10 });
        await page.mouse.up();

        // Console panel should be taller after dragging up
        const consolePanelAfter = await panels.nth(panelCount - 1).boundingBox();
        expect(consolePanelAfter).not.toBeNull();
        expect(consolePanelAfter!.height).toBeGreaterThan(
        consolePanelBefore!.height + 20,
        );
    });
});
