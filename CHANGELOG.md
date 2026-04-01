# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.2.1](https://github.com/faddah/code-canvas-astro/compare/v2.2.0...v2.2.1) (2026-04-01)


### Bug Fixes

* pre-load micropip during Pyodide initialization with `pyodide.loadPackage("micropip")` — fixes `ModuleNotFoundError: No module named 'micropip'` when running scripts with third-party packages ([ed2a29d](https://github.com/faddah/code-canvas-astro/commit/ed2a29d))


## [2.2.0](https://github.com/faddah/code-canvas-astro/compare/v2.1.1...v2.2.0) (2026-04-01)

### Features

* add PyPI package management — users can add/remove Python packages per project via the Explorer sidebar ([8e2b55f](https://github.com/faddah/code-canvas-astro/commit/8e2b55f))
* add `project_packages` database table with Drizzle ORM schema, list/create/delete methods in DatabaseStorage ([084d5bf](https://github.com/faddah/code-canvas-astro/commit/084d5bf))
* add API routes for packages — GET `/api/packages`, POST `/api/packages/create`, DELETE `/api/packages/[id]` with Clerk auth ([8e2b55f](https://github.com/faddah/code-canvas-astro/commit/8e2b55f))
* add `usePackages`, `useAddPackage`, `useRemovePackage` React Query hooks with retry/backoff ([e627344](https://github.com/faddah/code-canvas-astro/commit/e627344))
* integrate micropip into Pyodide `runCode()` — auto-installs project packages before executing Python code ([c9d8f34](https://github.com/faddah/code-canvas-astro/commit/c9d8f34))
* scope packages to the active project — packages are tied to the currently selected project in the Explorer ([482c339](https://github.com/faddah/code-canvas-astro/commit/482c339))
* show project name label in Packages section header in Explorer sidebar ([186d5c4](https://github.com/faddah/code-canvas-astro/commit/186d5c4))
* show install progress messages in console — "Installing numpy, pandas..." and "Installed 2 packages." ([e981f3d](https://github.com/faddah/code-canvas-astro/commit/e981f3d))
* add Package icon and Add Package dialog in ExplorerPane UI ([f8d56e6](https://github.com/faddah/code-canvas-astro/commit/f8d56e6))

### Bug Fixes

* remove `Error.isError()` (ES2026 proposal) causing GitHub Actions CI failures — replaced with empty catch block ([30c3f78](https://github.com/faddah/code-canvas-astro/commit/30c3f78))
* fix `projectId` referenced before defined in packages index.ts API route ([90c46a0](https://github.com/faddah/code-canvas-astro/commit/90c46a0))
* expand catch error messaging in packages create.ts for better debugging ([b767872](https://github.com/faddah/code-canvas-astro/commit/b767872))

### Tests

* add 12 unit tests for `usePackages`, `useAddPackage`, `useRemovePackage` hooks ([2a64618](https://github.com/faddah/code-canvas-astro/commit/2a64618))
* add 10 unit tests for Project Packages CRUD in DatabaseStorage ([5d8ab50](https://github.com/faddah/code-canvas-astro/commit/5d8ab50))
* add 4 Playwright e2e tests for packages API routes (401 auth checks, anonymous UI) ([fd7be2b](https://github.com/faddah/code-canvas-astro/commit/fd7be2b))
* add 2 ExplorerPane unit tests for project name label visibility ([17db853](https://github.com/faddah/code-canvas-astro/commit/17db853))
* add 3 use-pyodide unit tests for micropip install progress messages ([311655a](https://github.com/faddah/code-canvas-astro/commit/311655a))
* update ExplorerPane test helper with new package props ([5344376](https://github.com/faddah/code-canvas-astro/commit/5344376))
* update IDE-interactions test for new `runCode` 3-arg signature ([41b2384](https://github.com/faddah/code-canvas-astro/commit/41b2384))

### CI/CD

* upgrade GitHub Actions — checkout v6, setup-node v6, upload-artifact v7, Node.js 22 ([9b3433e](https://github.com/faddah/code-canvas-astro/commit/9b3433e))
* increase Playwright worker processes from 1 to 2 for faster CI runs ([90db0bf](https://github.com/faddah/code-canvas-astro/commit/90db0bf))
* add separate build step before e2e tests, refactor webServer to use `npm run preview` in CI ([fe5d724](https://github.com/faddah/code-canvas-astro/commit/fe5d724))
* add `actions/cache@v5` for e2e test caching ([4bbaab1](https://github.com/faddah/code-canvas-astro/commit/4bbaab1))

### Dependencies

* update @clerk/astro, @clerk/react, @clerk/testing ([6c952db](https://github.com/faddah/code-canvas-astro/commit/6c952db))
* update @tanstack/react-query ([6c952db](https://github.com/faddah/code-canvas-astro/commit/6c952db))
* update @playwright/test and playwright ([6c952db](https://github.com/faddah/code-canvas-astro/commit/6c952db))
* update aws-cdk ([6c952db](https://github.com/faddah/code-canvas-astro/commit/6c952db))
* add TypeScript v^5.9.3 as devDependency ([6ad7cd9](https://github.com/faddah/code-canvas-astro/commit/6ad7cd9))

### [2.1.1](https://github.com/faddah/code-canvas-astro/compare/v2.1.0...v2.1.1) (2026-03-30)

### Bug Fixes (2.1.1)

* fix Playwright e2e tests stalling due to stale Astro dev server on port 4321 ([9fb8a6c](https://github.com/faddah/code-canvas-astro/commit/9fb8a6c))
* add `pretest:e2e` script to kill any existing server on port 4321 before running e2e tests ([b63eb60](https://github.com/faddah/code-canvas-astro/commit/b63eb60))
* set `reuseExistingServer: false` in Playwright config so tests always start a fresh Astro server ([9fb8a6c](https://github.com/faddah/code-canvas-astro/commit/9fb8a6c))
* refactor `astro.config.mjs` import from `createRequire` (node:module) to `defineConfig` (astro/config) for Astro 6.1.1 compatibility ([2e96aca](https://github.com/faddah/code-canvas-astro/commit/2e96aca))
* refactor import of `defineConfig` & `devices` in Playwright config ([3194d21](https://github.com/faddah/code-canvas-astro/commit/3194d21))

### Dependency Updates

* update Astro to v^6.1.1 (then v^6.1.2) ([4fd170e](https://github.com/faddah/code-canvas-astro/commit/4fd170e))
* update drizzle-orm to v^0.45.2 ([4fd170e](https://github.com/faddah/code-canvas-astro/commit/4fd170e))
* update drizzle-kit to v^0.31.10 (was v^0.18.1) ([b63eb60](https://github.com/faddah/code-canvas-astro/commit/b63eb60))
* update aws-cdk to v^2.1115.0 (corrected from v^3.0.0) ([b63eb60](https://github.com/faddah/code-canvas-astro/commit/b63eb60))
* update react-resizable-panels to v^4.8.0 ([b63eb60](https://github.com/faddah/code-canvas-astro/commit/b63eb60))
* update lucide-react to v^1.7.0 ([b63eb60](https://github.com/faddah/code-canvas-astro/commit/b63eb60))

## [2.1.0](https://github.com/faddah/code-canvas-astro/compare/v2.0.1...v2.1.0) (2026-03-27)

* add Save/Open dialogs, project management, and Explorer drag-and-drop ([d4d19bc](https://github.com/faddah/code-canvas-astro/commit/d4d19bcbe463216ec57fafffd673387864f82af2))

### [2.0.1](https://github.com/faddah/code-canvas-astro/compare/v2.0.0...v2.0.1) (2026-03-26)

## [2.0.0](https://github.com/faddah/code-canvas-astro/compare/v1.7.0...v2.0.0) (2026-03-26)

## [1.7.0](https://github.com/faddah/code-canvas-astro/compare/v1.6.0...v1.7.0) (2026-03-26)

## [1.6.0](https://github.com/faddah/code-canvas-astro/compare/v1.5.2...v1.6.0) (2026-03-16)

### [1.5.2](https://github.com/faddah/code-canvas-astro/compare/v1.5.1...v1.5.2) (2026-03-14)

### [1.5.1](https://github.com/faddah/code-canvas-astro/compare/v1.5.0...v1.5.1) (2026-03-12)

## [1.5.0](https://github.com/faddah/code-canvas-astro/compare/v1.4.1...v1.5.0) (2026-03-11)

### [1.4.1](https://github.com/faddah/code-canvas-astro/compare/v1.4.0...v1.4.1) (2026-03-10)

## [1.4.0](https://github.com/faddah/code-canvas-astro/compare/v1.3.0...v1.4.0) (2026-03-09)

## [1.3.0](https://github.com/faddah/code-canvas-astro/compare/v1.2.6...v1.3.0) (2026-03-04)

### [1.2.6](https://github.com/faddah/code-canvas-astro/compare/v1.2.5...v1.2.6) (2026-02-23)

### [1.2.5](https://github.com/faddah/code-canvas-astro/compare/v1.2.4...v1.2.5) (2026-02-22)

### [1.2.4](https://github.com/faddah/code-canvas-astro/compare/v1.2.3...v1.2.4) (2026-02-21)

### [1.2.3](https://github.com/faddah/code-canvas-astro/compare/v1.2.2...v1.2.3) (2026-02-21)

### [1.2.2](https://github.com/faddah/code-canvas-astro/compare/v1.2.1...v1.2.2) (2026-02-21)
