import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

// Mock starter files returned by the API
export const MOCK_STARTER_FILES = [
  {
    id: 1,
    name: "main.py",
    content: 'print("hello from e2e")\n',
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    name: "utils.py",
    content: "# utility functions\ndef add(a, b):\n    return a + b\n",
    createdAt: "2025-01-01T00:00:00.000Z",
  },
];

/** Intercept /api/starter-files → return mock data (avoids Turso DB errors) */
export async function mockStarterFilesAPI(page: Page) {
  await page.route("**/api/starter-files", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_STARTER_FILES),
    }),
  );
}

/** Block Pyodide CDN with empty JS (avoids vite-error-overlay from route.abort()) */
export async function blockPyodide(page: Page) {
  await page.route("**/cdn.jsdelivr.net/pyodide/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: "// pyodide blocked for testing",
    }),
  );
}

/**
 * Provide a mock loadPyodide that fakes stdout for print() statements.
 * Use this INSTEAD OF blockPyodide when you need Pyodide to appear "ready"
 * so the Run button works and console output can be tested.
 */
export async function mockPyodide(page: Page) {
  await page.addInitScript(() => {
    var stdoutCallback: ((msg: string) => void) | null = null;
    var stderrCallback: ((msg: string) => void) | null = null;

    (window as any).loadPyodide = async function () {
      return {
        setStdout: function (opts: { batched: (msg: string) => void }) {
          stdoutCallback = opts.batched;
        },
        setStderr: function (opts: { batched: (msg: string) => void }) {
          stderrCallback = opts.batched;
        },
        loadPackage: async function () {},
        runPythonAsync: async function (code: string) {
          // JSPI detection — throw to mimic no JSPI support
          if (code.includes("run_sync")) {
            throw new Error("No JSPI support");
          }
          // Simulate Python raise → caught by usePyodide as [Error]
          if (code.includes("raise ")) {
            var errorMatch = code.match(/raise\s+\w+\(["'](.+?)["']\)/);
            throw new Error(errorMatch ? errorMatch[1] : "Python error");
          }
          // Extract print() calls and send to stdout
          var printRegex = /print\(["'](.+?)["']\)/g;
          var match;
          while ((match = printRegex.exec(code)) !== null) {
            if (stdoutCallback) stdoutCallback(match[1]);
          }
        },
        FS: {
          writeFile: function () {},
        },
      };
    };
  });
}

/**
 * Remove any <vite-error-overlay> currently in the DOM.
 *
 * The overlay uses `position: fixed; inset: 0` and blocks ALL pointer events.
 * In production there is no Vite overlay — it's purely a dev-server artifact.
 * Call this before any click that might be blocked by a transient server error.
 */
export async function dismissViteOverlay(page: Page) {
  await page.evaluate(() => {
    document
      .querySelectorAll("vite-error-overlay")
      .forEach((el) => el.remove());
  });
}

/** Wait for the IDE shell to render (Console panel visible) */
export async function waitForIDEShell(page: Page) {
  // IDE hydration + asset loading can exceed 30s
  await dismissViteOverlay(page);
  await expect(
    page.locator(".panel-header >> text=Console").first(),
  ).toBeVisible({ timeout: 60_000 });
}

/** Wait for at least one file in the Explorer */
export async function waitForFiles(page: Page) {
  await expect(page.locator(".truncate.flex-1").first()).toBeVisible({
    timeout: 15_000,
  });
}

// ─── Authenticated API mock helpers ──────────────────────────────────

export const MOCK_USER_PROFILE = {
  id: 1,
  clerkId: "user_test123",
  country: "US",
  phone: "+1 555-123-4567",
  city: "Portland",
  state: "OR",
  postalCode: "97201",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

export const MOCK_PROJECTS = [
  {
    id: 1,
    name: "My Project",
    clerkId: "user_test123",
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    name: "Second Project",
    clerkId: "user_test123",
    createdAt: "2025-01-02T00:00:00.000Z",
  },
];

export const MOCK_USER_FILES = [
  {
    id: 101,
    name: "app.py",
    content: '# authenticated file\nprint("hello authenticated")\n',
    projectId: 1,
    clerkId: "user_test123",
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: 102,
    name: "helpers.py",
    content: "# project helpers\ndef greet():\n    return 'hi'\n",
    projectId: 1,
    clerkId: "user_test123",
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: 103,
    name: "solo.py",
    content: "# no project\nprint('solo')\n",
    projectId: null,
    clerkId: "user_test123",
    createdAt: "2025-01-02T00:00:00.000Z",
  },
];

export const MOCK_PACKAGES = [
  { id: 1, packageName: "numpy", projectId: 1, clerkId: "user_test123" },
  { id: 2, packageName: "requests", projectId: 1, clerkId: "user_test123" },
];

/** Mock GET /api/user-profile → return profile or null */
export async function mockUserProfileAPI(
  page: Page,
  profile = MOCK_USER_PROFILE as typeof MOCK_USER_PROFILE | null,
) {
  await page.route("**/api/user-profile", (route, request) => {
    if (request.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(profile),
      });
    }
    return route.continue();
  });
}

/** Mock POST /api/user-profile → accept any body, return profile */
export async function mockCreateProfileAPI(page: Page) {
  await page.route("**/api/user-profile", (route, request) => {
    if (request.method() === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_USER_PROFILE),
      });
    }
    return route.continue();
  });
}

/** Mock PUT /api/user-profile → return updated profile */
export async function mockUpdateProfileAPI(page: Page) {
  await page.route("**/api/user-profile", (route, request) => {
    if (request.method() === "PUT") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_USER_PROFILE),
      });
    }
    return route.fallback();
  });
}

/** Mock DELETE /api/user-profile → return success */
export async function mockDeleteProfileAPI(page: Page) {
  await page.route("**/api/user-profile", (route, request) => {
    if (request.method() === "DELETE") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    }
    return route.fallback();
  });
}

/** Mock GET /api/user-files → return mock files */
export async function mockUserFilesAPI(page: Page, files = MOCK_USER_FILES) {
  await page.route("**/api/user-files", (route, request) => {
    if (request.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(files),
      });
    }
    return route.continue();
  });
}

/** Mock GET /api/projects → return mock projects */
export async function mockProjectsAPI(page: Page, projects = MOCK_PROJECTS) {
  await page.route("**/api/projects", (route, request) => {
    if (request.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(projects),
      });
    }
    return route.continue();
  });
}

/** Mock POST /api/projects/create → return a new project */
export async function mockCreateProjectAPI(page: Page) {
  let nextId = 100;
  await page.route("**/api/projects/create", (route, request) => {
    if (request.method() === "POST") {
      const body = JSON.parse(request.postData() || "{}");
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: nextId++,
          name: body.name || "New Project",
          clerkId: "user_test123",
          createdAt: new Date().toISOString(),
        }),
      });
    }
    return route.continue();
  });
}

/** Mock DELETE /api/projects/[id] → return success */
export async function mockDeleteProjectAPI(page: Page) {
  await page.route("**/api/projects/*", (route, request) => {
    if (request.method() === "DELETE") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    }
    return route.continue();
  });
}

/** Mock GET /api/packages → return mock packages */
export async function mockPackagesAPI(page: Page, packages = MOCK_PACKAGES) {
  await page.route("**/api/packages?**", (route, request) => {
    if (request.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(packages),
      });
    }
    return route.continue();
  });
}

/** Mock POST /api/packages/create → return a new package */
export async function mockAddPackageAPI(page: Page) {
  let nextId = 100;
  await page.route("**/api/packages/create", (route, request) => {
    if (request.method() === "POST") {
      const body = JSON.parse(request.postData() || "{}");
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: nextId++,
          packageName: body.packageName || "new-package",
          projectId: body.projectId || 1,
          clerkId: "user_test123",
        }),
      });
    }
    return route.continue();
  });
}

/** Mock DELETE /api/packages/[id] → return success */
export async function mockDeletePackageAPI(page: Page) {
  await page.route("**/api/packages/*", (route, request) => {
    if (request.method() === "DELETE") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    }
    return route.continue();
  });
}

/** Mock POST /api/user-files/create → return a new file */
export async function mockCreateFileAPI(page: Page) {
  let nextId = 200;
  await page.route("**/api/user-files/create", (route, request) => {
    if (request.method() === "POST") {
      const body = JSON.parse(request.postData() || "{}");
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: nextId++,
          name: body.name || "new_file.py",
          content: body.content || "",
          projectId: body.projectId || null,
          clerkId: "user_test123",
          createdAt: new Date().toISOString(),
        }),
      });
    }
    return route.continue();
  });
}

/** Mock PUT /api/user-files/[id] → return updated file */
export async function mockUpdateFileAPI(page: Page) {
  await page.route("**/api/user-files/*", (route, request) => {
    if (request.method() === "PUT") {
      const body = JSON.parse(request.postData() || "{}");
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...body, id: 101 }),
      });
    }
    return route.continue();
  });
}

/** Mock DELETE /api/user-files/[id] → return success */
export async function mockDeleteFileAPI(page: Page) {
  await page.route("**/api/user-files/*", (route, request) => {
    if (request.method() === "DELETE") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    }
    return route.continue();
  });
}

/** Convenience: set up all authenticated API mocks at once */
export async function mockAllAuthenticatedAPIs(page: Page) {
  await mockUserProfileAPI(page);
  await mockUserFilesAPI(page);
  await mockProjectsAPI(page);
  await mockCreateProjectAPI(page);
  await mockDeleteProjectAPI(page);
  await mockPackagesAPI(page);
  await mockAddPackageAPI(page);
  await mockDeletePackageAPI(page);
  await mockCreateFileAPI(page);
  await mockUpdateFileAPI(page);
  await mockDeleteFileAPI(page);
}
