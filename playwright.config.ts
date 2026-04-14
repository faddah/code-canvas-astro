import { defineConfig, devices } from "@playwright/test";

const STORAGE_STATE = "e2e/.auth/user.json";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 2,
  reporter: "html",
  use: {
    baseURL: "https://localhost:4321",
    ignoreHTTPSErrors: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // ─── Setup: runs once before any authenticated-* project. Signs in
    //     the test user via Clerk and persists storageState to disk. ───

    {
      name: "setup-chromium",
      testMatch: /auth\.setup\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "setup-firefox",
      testMatch: /auth\.setup\.ts$/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "setup-webkit",
      testMatch: /auth\.setup\.ts$/,
      use: { ...devices["Desktop Safari"] },
    },

    // ─── Anonymous projects (existing behavior) ──────────────────────
    //     Excludes the setup file and any *.auth.spec.ts files that
    //     require a signed-in session.
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [/auth\.setup\.ts$/, /\.auth\.spec\.ts$/],
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      testIgnore: [/auth\.setup\.ts$/, /\.auth\.spec\.ts$/],
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testIgnore: [/auth\.setup\.ts$/, /\.auth\.spec\.ts$/],
    },

    // ─── Authenticated projects ──────────────────────────────────────
    //     Only run *.auth.spec.ts files. Each depends on "setup" so the
    //     sign-in runs first, and loads the persisted storageState so
    //     every test starts already-signed-in as the Clerk test user.
    {
      name: "authenticated-chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/setup-chromium.json",
      },
      testMatch: /\.auth\.spec\.ts$/,
      dependencies: ["setup-chromium"],
    },
    {
      name: "authenticated-firefox",
      use: {
        ...devices["Desktop Firefox"],
        storageState: "e2e/.auth/setup-firefox.json",
      },
      testMatch: /\.auth\.spec\.ts$/,
      dependencies: ["setup-firefox"],
    },
    {
      name: "authenticated-webkit",
      use: {
        ...devices["Desktop Safari"],
        storageState: "e2e/.auth/setup-webkit.json",
      },
      testMatch: /\.auth\.spec\.ts$/,
      dependencies: ["setup-webkit"],
    },
  ],
  webServer: {
    command: process.env.CI ? "npm run preview" : "npm run dev",
    url: "https://localhost:4321",
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
