import { test, expect } from "./fixtures/authenticated";
import {
    blockPyodide,
    dismissViteOverlay,
    waitForIDEShell,
    waitForFiles,
    mockUserProfileAPI,
    mockUpdateProfileAPI,
    mockDeleteProfileAPI,
    mockUserFilesAPI,
    mockProjectsAPI,
    mockPackagesAPI,
} from "./helpers";

test.describe("UserProfileModal — view mode", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        await mockUserProfileAPI(page);
        await mockUpdateProfileAPI(page);
        await mockDeleteProfileAPI(page);
        await mockUserFilesAPI(page);
        await mockProjectsAPI(page, []);
        await mockPackagesAPI(page, []);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);
        await waitForFiles(page);
    });

    test("profile button opens the User Profile modal", async ({ page }) => {
        // Profile button shows user email (contains "@")
        const profileBtn = page.locator("button", { hasText: "@" }).first();
        await expect(profileBtn).toBeVisible({ timeout: 10_000 });
        await profileBtn.click();

        await expect(
            page.locator("text=User Profile").first(),
        ).toBeVisible({ timeout: 5_000 });
    });

    test("view mode shows profile data from mock", async ({ page }) => {
        const profileBtn = page.locator("button", { hasText: "@" }).first();
        await profileBtn.click();

        await expect(
            page.locator("text=User Profile").first(),
        ).toBeVisible({ timeout: 5_000 });

        // Verify mock profile values are displayed
        await expect(page.locator("text=+1 555-123-4567").first()).toBeVisible();
        await expect(page.locator("text=Portland").first()).toBeVisible();
        await expect(page.locator("text=97201").first()).toBeVisible();

        // Verify action buttons in view mode
        await expect(
            page.locator('button:has-text("Edit Profile")'),
        ).toBeVisible();
        await expect(
            page.locator('button:has-text("Delete Profile")'),
        ).toBeVisible();
    });

    test("Cancel closes the modal", async ({ page }) => {
        const profileBtn = page.locator("button", { hasText: "@" }).first();
        await profileBtn.click();

        const modalTitle = page.locator("text=User Profile").first();
        await expect(modalTitle).toBeVisible({ timeout: 5_000 });

        await page.locator('button:has-text("Cancel")').first().click();

        await expect(modalTitle).not.toBeVisible({ timeout: 5_000 });
    });
});

test.describe("UserProfileModal — edit mode", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        await mockUserProfileAPI(page);
        await mockUpdateProfileAPI(page);
        await mockDeleteProfileAPI(page);
        await mockUserFilesAPI(page);
        await mockProjectsAPI(page, []);
        await mockPackagesAPI(page, []);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);
        await waitForFiles(page);

        // Open the modal
        const profileBtn = page.locator("button", { hasText: "@" }).first();
        await expect(profileBtn).toBeVisible({ timeout: 10_000 });
        await profileBtn.click();
        await expect(
            page.locator("text=User Profile").first(),
        ).toBeVisible({ timeout: 5_000 });
    });

    test("Edit Profile button switches to edit mode with form fields", async ({
        page,
    }) => {
        await page.locator('button:has-text("Edit Profile")').click();

        // Form fields should appear
        await expect(page.locator('label:has-text("Phone Number")')).toBeVisible(
            { timeout: 5_000 },
        );
        await expect(page.locator('label:has-text("City")')).toBeVisible();
        await expect(
            page.locator('label:has-text("State / Province")'),
        ).toBeVisible();
        await expect(page.locator('label:has-text("Postal Code")')).toBeVisible();
        await expect(page.locator('label:has-text("Country")')).toBeVisible();

        // Save and Cancel buttons in edit mode
        await expect(
            page.locator('button:has-text("Save Changes")'),
        ).toBeVisible();
        await expect(
            page.locator('button:has-text("Cancel")'),
        ).toBeVisible();
    });

    test("Cancel in edit mode returns to view mode", async ({ page }) => {
        await page.locator('button:has-text("Edit Profile")').click();

        await expect(
            page.locator('label:has-text("Phone Number")'),
        ).toBeVisible({ timeout: 5_000 });

        // Click Cancel
        await page.locator('button:has-text("Cancel")').first().click();

        // Should be back in view mode — Edit Profile button visible again
        await expect(
            page.locator('button:has-text("Edit Profile")'),
        ).toBeVisible({ timeout: 5_000 });
    });

    test("Save Changes calls PUT /api/user-profile", async ({ page }) => {
        await page.locator('button:has-text("Edit Profile")').click();

        await expect(
            page.locator('label:has-text("City")'),
        ).toBeVisible({ timeout: 5_000 });

        // Change the city field
        const cityInput = page.locator("input#city");
        await cityInput.clear();
        await cityInput.fill("Salem");

        // Set up request interception before clicking Save
        const putPromise = page.waitForRequest(
            (req) =>
                req.url().includes("/api/user-profile") &&
                req.method() === "PUT",
        );

        await dismissViteOverlay(page);
        await page
            .locator('button:has-text("Save Changes")')
            .click({ force: true });

        // Verify the PUT request was made
        const putRequest = await putPromise;
        const body = putRequest.postDataJSON();
        expect(body.city).toBe("Salem");
    });
});

test.describe("UserProfileModal — delete flow", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        await mockUserProfileAPI(page);
        await mockUpdateProfileAPI(page);
        await mockDeleteProfileAPI(page);
        await mockUserFilesAPI(page);
        await mockProjectsAPI(page, []);
        await mockPackagesAPI(page, []);
        await blockPyodide(page);
        await page.goto("/");
        await waitForIDEShell(page);
        await waitForFiles(page);

        // Open the modal
        const profileBtn = page.locator("button", { hasText: "@" }).first();
        await expect(profileBtn).toBeVisible({ timeout: 10_000 });
        await profileBtn.click();
        await expect(
            page.locator("text=User Profile").first(),
        ).toBeVisible({ timeout: 5_000 });
    });

    test("Delete Profile button shows confirmation dialog", async ({
        page,
    }) => {
        await page.locator('button:has-text("Delete Profile")').click();

        await expect(
            page.locator("text=Delete Account").first(),
        ).toBeVisible({ timeout: 5_000 });

        await expect(
            page
                .locator("text=Are you certain you wish to completely delete")
                .first(),
        ).toBeVisible();
    });

    test("Cancel dismisses the delete confirmation", async ({ page }) => {
        await page.locator('button:has-text("Delete Profile")').click();

        await expect(
            page.locator("text=Delete Account").first(),
        ).toBeVisible({ timeout: 5_000 });

        // Click Cancel in the AlertDialog
        await page.locator('button:has-text("Cancel")').first().click();

        // Confirmation should disappear, but modal stays open
        await expect(
            page.locator("text=Delete Account").first(),
        ).not.toBeVisible({ timeout: 5_000 });

        await expect(
            page.locator("text=User Profile").first(),
        ).toBeVisible();
    });

    test("Confirm delete calls DELETE /api/user-profile", async ({
        page,
    }) => {
        await page.locator('button:has-text("Delete Profile")').first().click();

        await expect(
            page.locator("text=Delete Account").first(),
        ).toBeVisible({ timeout: 5_000 });

        // Set up request interception before clicking confirm
        const deletePromise = page.waitForRequest(
            (req) =>
                req.url().includes("/api/user-profile") &&
                req.method() === "DELETE",
        );

        // The AlertDialog has TWO buttons: "Cancel" and "Delete Profile"
        // Click the "Delete Profile" action button inside the AlertDialog
        await dismissViteOverlay(page);
        const alertDialog = page.locator('[role="alertdialog"]');
        await alertDialog
            .locator('button:has-text("Delete Profile")')
            .click({ force: true });

        // Verify the DELETE request was made
        const deleteRequest = await deletePromise;
        expect(deleteRequest.method()).toBe("DELETE");
    });
});