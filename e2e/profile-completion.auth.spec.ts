import { test, expect } from "./fixtures/authenticated";
import {
    blockPyodide,
    waitForIDEShell,
    mockUserProfileAPI,
    mockCreateProfileAPI,
    mockUserFilesAPI,
    mockProjectsAPI,
    mockPackagesAPI,
    MOCK_USER_FILES,
} from "./helpers";

test.describe("Profile completion flow", () => {
    test.setTimeout(60_000);

    test.beforeEach(async ({ page }) => {
        // Mock profile as null → triggers CompleteProfile modal
        await mockUserProfileAPI(page, null);
        await mockCreateProfileAPI(page);
        await mockUserFilesAPI(page);
        await mockProjectsAPI(page, []);
        await mockPackagesAPI(page, []);
        await blockPyodide(page);
    });

    test("shows Complete Your Profile modal when profile is null", async ({
        page,
    }) => {
        await page.goto("/");
        await waitForIDEShell(page);

        await expect(
        page.locator("text=Complete Your Profile").first(),
        ).toBeVisible({ timeout: 15_000 });

        await expect(
        page.locator("text=Please fill in your profile information").first(),
        ).toBeVisible();
    });

    test("modal has all required form fields", async ({ page }) => {
        await page.goto("/");
        await waitForIDEShell(page);
shw        await expect(
        page.locator("text=Complete Your Profile").first(),
        ).toBeVisible({ timeout: 15_000 });

        // Country select
        await expect(page.locator("text=Country").first()).toBeVisible();

        // Phone input
        await expect(page.locator("#phone")).toBeVisible();

        // City input
        await expect(page.locator("#city")).toBeVisible();

        // State input
        await expect(page.locator("#state")).toBeVisible();

        // Postal Code input
        await expect(page.locator("#postalCode")).toBeVisible();

        // Buttons
        await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
        await expect(page.locator('button:has-text("Save Profile")')).toBeVisible();
    });

    test("Cancel button closes the modal", async ({ page }) => {
        await page.goto("/");
        await waitForIDEShell(page);

        await expect(
        page.locator("text=Complete Your Profile").first(),
        ).toBeVisible({ timeout: 15_000 });

        await page.locator('button:has-text("Cancel")').click();

        await expect(
        page.locator("text=Complete Your Profile").first(),
        ).not.toBeVisible({ timeout: 5_000 });
    });

    test("filling and submitting the form calls create profile API", async ({
        page,
    }) => {
        let profileCreateCalled = false;
        await page.route("**/api/user-profile", (route, request) => {
        if (request.method() === "POST") {
            profileCreateCalled = true;
            return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                id: 1,
                clerkId: "user_test123",
                country: "US",
                phone: "+1 5551234567",
                city: "Portland",
                state: "OR",
                postalCode: "97201",
            }),
            });
        }
        if (request.method() === "GET") {
            // After successful creation, return the profile
            if (profileCreateCalled) {
            return route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                id: 1,
                clerkId: "user_test123",
                country: "US",
                phone: "+1 5551234567",
                city: "Portland",
                state: "OR",
                postalCode: "97201",
                }),
            });
            }
            return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(null),
            });
        }
        return route.continue();
        });

        await page.goto("/");
        await waitForIDEShell(page);

        await expect(
        page.locator("text=Complete Your Profile").first(),
        ).toBeVisible({ timeout: 15_000 });

        // Fill in the form
        await page.locator("#phone").fill("5551234567");
        await page.locator("#city").fill("Portland");
        await page.locator("#state").fill("OR");
        await page.locator("#postalCode").fill("97201");

        // Submit
        await page.locator('button:has-text("Save Profile")').click();

        // Modal should close after successful submit
        await expect(
        page.locator("text=Complete Your Profile").first(),
        ).not.toBeVisible({ timeout: 10_000 });

        expect(profileCreateCalled).toBe(true);
    });

    test("does NOT show modal when profile already exists", async ({ page }) => {
        // Override: return a real profile instead of null
        await page.unrouteAll();
        await mockUserProfileAPI(page);
        await mockUserFilesAPI(page);
        await mockProjectsAPI(page, []);
        await mockPackagesAPI(page, []);
        await blockPyodide(page);

        await page.goto("/");
        await waitForIDEShell(page);

        // Give it a moment to potentially appear, then verify it didn't
        await page.waitForTimeout(3_000);
        await expect(
        page.locator("text=Complete Your Profile").first(),
        ).not.toBeVisible();
    });
});
