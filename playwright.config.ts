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
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // ─── Setup: runs once before any authenticated-* project. Signs in
    //     the test user via Clerk and persists storageState to disk. ───
    {
      name: "setup",
      testMatch: /auth\.setup\.ts$/,
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
        storageState: STORAGE_STATE,
      },
      testMatch: /\.auth\.spec\.ts$/,
      dependencies: ["setup"],
    },
    {
      name: "authenticated-firefox",
      use: {
        ...devices["Desktop Firefox"],
        storageState: STORAGE_STATE,
      },
      testMatch: /\.auth\.spec\.ts$/,
      dependencies: ["setup"],
    },
    {
      name: "authenticated-webkit",
      use: {
        ...devices["Desktop Safari"],
        storageState: STORAGE_STATE,
      },
      testMatch: /\.auth\.spec\.ts$/,
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: process.env.CI ? "npm run preview" : "npm run dev",
    url: "http://localhost:4321",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
