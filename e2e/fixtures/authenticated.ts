import { test as base, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

export { expect };

export const test = base.extend<{ clerkPage: void }>({
    clerkPage: [
        async ({ page }, use) => {
            await setupClerkTestingToken({ page });
            await use();
        },
        { auto: true },
    ],
});
