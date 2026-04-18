import { axe } from "vitest-axe";
import { toHaveNoViolations, type AxeMatchers } from "vitest-axe/dist/matchers";
import { expect } from "vitest";
import type { AxeCore } from "vitest-axe";

declare module "vitest" {
    interface Assertion<T = any> extends AxeMatchers {}
    interface AsymmetricMatchersContaining extends AxeMatchers {}
}

// Register the matcher once, globally, on Vitest's expect.
// Every test that imports from this file gets `.toHaveNoViolations()` available.
expect.extend({ toHaveNoViolations });

// Default rule set: WCAG 2.0 + 2.1 Level A and AA.
// This is the industry/legal baseline (ADA, EN 301 549, Section 508 via WCAG 2.0 AA).
// AAA is aspirational and includes rules that often can't be satisfied at the
// component level.
const defaultRunOptions: AxeCore.RunOptions = {
    runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    },

    // color-contrast is disabled in jsdom: it can't compute layered CSS,
    // so it returns false positives. We re-enable it in Playwright tests.
    rules: {
        "color-contrast": { enabled: false },
    },
};

export async function axeCheck(
    container: Element,
    overrides: AxeCore.RunOptions = {},
) {
    return axe(container, { ...defaultRunOptions, ...overrides });
}

// Re-export so tests only need one import path.
export { axe };
