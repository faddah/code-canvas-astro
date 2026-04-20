# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.4.0](https://github.com/faddah/code-canvas-astro/compare/v2.3.0...v2.4.0) (2026-04-18)

### Features

* add accessibility testing infrastructure — new devDeps `vitest-axe`, `axe-core`, and `@axe-core/playwright` for WCAG 2.0 / 2.1 Level A + AA checks across both Vitest unit tests and Playwright e2e tests ([TBD])
* add `src/test/helpers/a11y.ts` — `axeCheck()` wrapper around `axe-core` with WCAG 2.0 / 2.1 A + AA rule set; the `color-contrast` check is disabled under jsdom since it can't compute computed styles ([TBD])
* wire `src/test/setup.ts` to import `@/test/helpers/a11y` so `toHaveNoViolations()` is globally registered on every Vitest suite ([TBD])
* instrument `<LoadingScreen>` for screen readers — `role="status"` + `aria-live="polite"` on the message so assistive tech announces loading state changes; `aria-hidden="true"` on the decorative spinner so it isn't announced ([TBD])

### Tests

* add `src/test/components/LoadingScreen.test.tsx` a11y coverage — `axeCheck()` runs against the rendered component, plus unit assertions that verify the new ARIA attributes are present ([TBD])

### Bug Fixes

* harden `clerk.loaded` wait in `e2e/auth.setup.ts` — replaced `clerk.loaded({ page })` with an explicit `page.waitForFunction(() => window.Clerk.loaded === true)` + 60 s timeout + diagnostic payload `{ defined, loaded, hasClient, version }` logged on failure; added `setup.setTimeout(90_000)` to give the whole flow room ([TBD])
* de-flake `e2e/user-profile-modal.auth.spec.ts` delete flow on Firefox — switched from text-based locators (`text=Delete Account`) to the semantic `[role="alertdialog"]` locator with 20 s timeouts across all three delete-flow tests; Radix sets the role attribute synchronously on portal mount while text-content lags one React commit ([TBD])
* de-flake `e2e/console-output.spec.ts:119` on WebKit — split the combined `.whitespace-pre-wrap.text-red-400` + `hasText: "[Error]"` locator into two decoupled assertions (text visibility first at 30 s, then `toHaveClass(/text-red-400/)`) so slow paint no longer races the conditional class swap ([TBD])

### Docs

* update `README.md` — add Accessibility subsection, add `vitest-axe` + `@axe-core/playwright` + `axe-core` to the Testing stack, bump Current Version to 2.4.0 ([TBD])
* update `CHANGELOG.md` and `CHANGELOG-simple.md` for v2.4.0 ([TBD])

## [2.3.0](https://github.com/faddah/code-canvas-astro/compare/v2.2.1...v2.3.0) (2026-04-16)

### Features in 2.3.0

* add `<LoadingScreen>` component with a "Taking too long? Reload" button that appears after a configurable timeout — replaces the inline loading spinner in `IDE.tsx` ([929491c](https://github.com/faddah/code-canvas-astro/commit/929491c))
* add `useLoadingStateCleanup` hook to track loading duration and surface a `loadingTooLong` flag for the new `<LoadingScreen>` ([7c9b461](https://github.com/faddah/code-canvas-astro/commit/7c9b461))
* make `<CompleteProfile>` modal dismissible — replaced the auto-show `useEffect` with `profileDismissed` state so `onComplete` and `onCancel` both close the modal ([2819f23](https://github.com/faddah/code-canvas-astro/commit/2819f23))
* add `<DialogTitle>` inside Command palette `<DialogContent>` for screen-reader accessibility, plus refactored `<Command>` CSS classes ([26da23b](https://github.com/faddah/code-canvas-astro/commit/26da23b))
* hide Explorer header on small (mobile) viewports for a cleaner mobile layout ([01af89b](https://github.com/faddah/code-canvas-astro/commit/01af89b))
* truncate long filenames in the Explorer pane so they don't break the layout ([94894d0](https://github.com/faddah/code-canvas-astro/commit/94894d0))

### Refactor — IDE.tsx Modularization

The monolithic `src/components/IDE.tsx` has been broken up into focused, individually-testable hooks and components.

* extract `useAuthState` to `src/hooks/use-auth-state.ts` ([75ccf65](https://github.com/faddah/code-canvas-astro/commit/75ccf65), [26f6c70](https://github.com/faddah/code-canvas-astro/commit/26f6c70))
* extract `useClerkUser` to `src/hooks/use-clerk-user.ts` ([38de54b](https://github.com/faddah/code-canvas-astro/commit/38de54b))
* extract `useFileManagement` to `src/hooks/use-file-management.ts` ([d1cdf80](https://github.com/faddah/code-canvas-astro/commit/d1cdf80))
* extract `useKeyboardShortcuts` to `src/hooks/use-keyboard-shortcuts.ts` ([945b32c](https://github.com/faddah/code-canvas-astro/commit/945b32c))
* extract `useProjectData` to `src/hooks/use-project-data.ts` ([02ca736](https://github.com/faddah/code-canvas-astro/commit/02ca736), [5119abd](https://github.com/faddah/code-canvas-astro/commit/5119abd))
* extract `usePackageData` to `src/hooks/use-package-data.ts` ([6124210](https://github.com/faddah/code-canvas-astro/commit/6124210), [b19c307](https://github.com/faddah/code-canvas-astro/commit/b19c307))
* extract `usePythonExecution` to `src/hooks/use-python-execution.ts` ([8167d08](https://github.com/faddah/code-canvas-astro/commit/8167d08), [572676f](https://github.com/faddah/code-canvas-astro/commit/572676f))
* extract `useLoadingStateCleanup` to `src/hooks/use-loading-state-cleanup.ts` ([7c9b461](https://github.com/faddah/code-canvas-astro/commit/7c9b461), [19df02c](https://github.com/faddah/code-canvas-astro/commit/19df02c))
* extract `<TopNavBar>` to `src/components/TopNavBar.tsx` and re-import into `IDE.tsx` ([7ce51fc](https://github.com/faddah/code-canvas-astro/commit/7ce51fc), [e9e9ae7](https://github.com/faddah/code-canvas-astro/commit/e9e9ae7))
* extract `<EditorPanel>` to `src/components/EditorPanel.tsx` ([414cf23](https://github.com/faddah/code-canvas-astro/commit/414cf23))
* extract `<ExecutionPanel>` to `src/components/ExecutionPanel.tsx` ([c15bbff](https://github.com/faddah/code-canvas-astro/commit/c15bbff))
* extract `<LoadingScreen>` to `src/components/LoadingScreen.tsx` ([929491c](https://github.com/faddah/code-canvas-astro/commit/929491c))

### Bug Fixes in v2.3.0

* refactor `<DialogContent>` props with `aria-describedby={undefined}` to silence Radix dialog warnings during Vitest runs ([4d1f4fd](https://github.com/faddah/code-canvas-astro/commit/4d1f4fd))
* replace deprecated React `ElementRef` with the modern `ComponentRef` across UI components ([90b7f7a](https://github.com/faddah/code-canvas-astro/commit/90b7f7a), [be6dd1b](https://github.com/faddah/code-canvas-astro/commit/be6dd1b))
* refactor file-tab targeting in tests to use `data-testid="file-tab"` and `data-active` attributes instead of fragile CSS selectors ([21dc9bb](https://github.com/faddah/code-canvas-astro/commit/21dc9bb))
* refactor `<Calendar>` chevron icons (`IconLeft` / `IconRight` → `Chevron`) for compatibility with the latest `react-day-picker` ([326cc30](https://github.com/faddah/code-canvas-astro/commit/326cc30))
* harden Tailwind config: `darkMode: ["class"]` → `darkMode: "class"` ([55311ca](https://github.com/faddah/code-canvas-astro/commit/55311ca))
* `tsconfig.json` — explicit `extends` path to `…/tsconfigs/strict.json` for TypeScript 6.x; add `target: "ESNext"`, `moduleDetection: "force"`, `moduleResolution: "Bundler"` ([aa44c8b](https://github.com/faddah/code-canvas-astro/commit/aa44c8b), [8fee952](https://github.com/faddah/code-canvas-astro/commit/8fee952))
* exclude `e2e/` from the main TypeScript program; give Playwright its own `e2e/tsconfig.json` ([3c5bfa9](https://github.com/faddah/code-canvas-astro/commit/3c5bfa9), [99badb5](https://github.com/faddah/code-canvas-astro/commit/99badb5), [f612157](https://github.com/faddah/code-canvas-astro/commit/f612157))

### Tests in v2.3.0

#### Vitest unit tests for the new modular hooks

* `src/test/hooks/use-auth-state.test.ts` ([0d704b7](https://github.com/faddah/code-canvas-astro/commit/0d704b7))
* `src/test/hooks/use-clerk-user.test.ts` ([ecfc8ea](https://github.com/faddah/code-canvas-astro/commit/ecfc8ea))
* `src/test/hooks/use-file-management.test.ts` ([de2b5ac](https://github.com/faddah/code-canvas-astro/commit/de2b5ac))
* `src/test/hooks/use-keyboard-shortcuts.test.ts` ([86f7654](https://github.com/faddah/code-canvas-astro/commit/86f7654))
* `src/test/hooks/use-project-data.test.ts` ([60154d5](https://github.com/faddah/code-canvas-astro/commit/60154d5))
* `src/test/hooks/use-package-data.test.ts` ([869e43d](https://github.com/faddah/code-canvas-astro/commit/869e43d))
* `src/test/hooks/use-python-execution.test.ts` ([a9254d5](https://github.com/faddah/code-canvas-astro/commit/a9254d5))
* `src/test/hooks/use-loading-state-cleanup.test.ts` ([2f90e8d](https://github.com/faddah/code-canvas-astro/commit/2f90e8d))
* `src/test/hooks/use-toast.test.ts` ([3061d74](https://github.com/faddah/code-canvas-astro/commit/3061d74))
* `src/test/lib/utils.test.ts` for `cn()` Tailwind class-name helper ([ab1230b](https://github.com/faddah/code-canvas-astro/commit/ab1230b))

#### Vitest unit tests for the new components

* `src/test/components/EditorPanel.test.tsx` and `ExecutionPanel.test.tsx` ([5ef5e22](https://github.com/faddah/code-canvas-astro/commit/5ef5e22))
* `src/test/components/TopNavBar.test.tsx` ([a104739](https://github.com/faddah/code-canvas-astro/commit/a104739), [53b3f73](https://github.com/faddah/code-canvas-astro/commit/53b3f73))
* `src/test/components/LoadingScreen.test.tsx` ([e525551](https://github.com/faddah/code-canvas-astro/commit/e525551))

#### Vitest unit tests for API routes

* `src/test/api/health.test.ts` ([dc599f9](https://github.com/faddah/code-canvas-astro/commit/dc599f9))
* `src/test/api/files/{index,create,[id]}.test.ts` ([e86627a](https://github.com/faddah/code-canvas-astro/commit/e86627a))
* `src/test/api/user-files/{index,create,[id]}.test.ts` ([b747d21](https://github.com/faddah/code-canvas-astro/commit/b747d21))
* `src/test/api/projects/{index,create,[id]}.test.ts` ([3e6fdc8](https://github.com/faddah/code-canvas-astro/commit/3e6fdc8))
* `src/test/api/packages/{index,create,[id]}.test.ts` ([0e8bb3a](https://github.com/faddah/code-canvas-astro/commit/0e8bb3a))
* `src/test/api/starter-files/index.test.ts` ([505f2b8](https://github.com/faddah/code-canvas-astro/commit/505f2b8))
* `src/test/api/user-profile/index.test.ts` ([c8eb59a](https://github.com/faddah/code-canvas-astro/commit/c8eb59a))

#### New Vitest helpers

* `src/test/helpers/mock-storage.ts` — mock `IStorage` for route tests ([a732fd5](https://github.com/faddah/code-canvas-astro/commit/a732fd5))
* `src/test/helpers/mock-api-context.ts` — minimal Astro `APIContext` factory ([4312f6e](https://github.com/faddah/code-canvas-astro/commit/4312f6e))
* `src/test/helpers/response-helpers.ts` — `expectResponse(...)` status + JSON body assertion ([7675612](https://github.com/faddah/code-canvas-astro/commit/7675612))

#### New Playwright e2e specs

* `e2e/auth.setup.ts` + `e2e/global-setup.ts` — Clerk sign-in setup, persisted `storageState` per browser engine ([8d25fb4](https://github.com/faddah/code-canvas-astro/commit/8d25fb4), [0ad4ad9](https://github.com/faddah/code-canvas-astro/commit/0ad4ad9), [979d964](https://github.com/faddah/code-canvas-astro/commit/979d964))
* `e2e/fixtures/authenticated.ts` — shared authenticated fixture ([77c7819](https://github.com/faddah/code-canvas-astro/commit/77c7819), [7c4cb7d](https://github.com/faddah/code-canvas-astro/commit/7c4cb7d))
* `e2e/profile-completion.auth.spec.ts` ([93d8960](https://github.com/faddah/code-canvas-astro/commit/93d8960))
* `e2e/project-crud.auth.spec.ts` ([3bcdcac](https://github.com/faddah/code-canvas-astro/commit/3bcdcac))
* `e2e/package-management.auth.spec.ts` ([a729042](https://github.com/faddah/code-canvas-astro/commit/a729042))
* `e2e/file-drag-drop.auth.spec.ts` ([2147289](https://github.com/faddah/code-canvas-astro/commit/2147289), [9a4b9df](https://github.com/faddah/code-canvas-astro/commit/9a4b9df))
* `e2e/file-delete.auth.spec.ts` ([a01f4ee](https://github.com/faddah/code-canvas-astro/commit/a01f4ee))
* `e2e/loading-reload.spec.ts` ([8d60a20](https://github.com/faddah/code-canvas-astro/commit/8d60a20))
* `e2e/explorer-error-state.auth.spec.ts` ([ece2113](https://github.com/faddah/code-canvas-astro/commit/ece2113))
* `e2e/escape-closes-dialogs.auth.spec.ts` ([e1522e1](https://github.com/faddah/code-canvas-astro/commit/e1522e1))
* `e2e/console-output.spec.ts` ([55738ba](https://github.com/faddah/code-canvas-astro/commit/55738ba))
* `e2e/user-profile-modal.auth.spec.ts` — 8 tests for view / edit / delete flows ([d1a171b](https://github.com/faddah/code-canvas-astro/commit/d1a171b))
* `e2e/new-file-flow.auth.spec.ts` + long-filename-truncation test ([174ccdc](https://github.com/faddah/code-canvas-astro/commit/174ccdc), [94894d0](https://github.com/faddah/code-canvas-astro/commit/94894d0))
* `e2e/save-flow.auth.spec.ts` ([c278bc8](https://github.com/faddah/code-canvas-astro/commit/c278bc8))
* `e2e/keyboard-save.auth.spec.ts` — `Cmd+S` / `Ctrl+S` save coverage ([6e19bcb](https://github.com/faddah/code-canvas-astro/commit/6e19bcb))
* `e2e/panel-resize.spec.ts` — drag the resizable panels, verify editor / console resize ([2ba5893](https://github.com/faddah/code-canvas-astro/commit/2ba5893))
* `e2e/responsive.spec.ts` — Explorer hidden at 375×667, visible at 1280×720 ([01af89b](https://github.com/faddah/code-canvas-astro/commit/01af89b))
* `e2e/ide-interactions.spec.ts` — IDE Console + Web Preview coverage ([2b3c37b](https://github.com/faddah/code-canvas-astro/commit/2b3c37b))

### CI/CD

* switch e2e job to the official `mcr.microsoft.com/playwright:v1.59.1-noble` container — Node 22 + all three browsers pre-installed; eliminated the ~29-minute `npx playwright install --with-deps` step ([9cabff3](https://github.com/faddah/code-canvas-astro/commit/9cabff3))
* add `Generate self-signed TLS cert for HTTPS preview proxy` step to the e2e job, plus an `actions/cache@v5` cache for Astro build output ([43bdd5f](https://github.com/faddah/code-canvas-astro/commit/43bdd5f))
* add `npm run preview:ci` script using `concurrently` to run `astro preview` + `e2e/https-proxy.mjs` in parallel ([5e873a9](https://github.com/faddah/code-canvas-astro/commit/5e873a9), [533345a](https://github.com/faddah/code-canvas-astro/commit/533345a))
* replace `local-ssl-proxy` with a custom `e2e/https-proxy.mjs` reverse proxy that targets `127.0.0.1:4322` directly to bypass IPv6/IPv4 resolution issues ([d5b862e](https://github.com/faddah/code-canvas-astro/commit/d5b862e))
* set `HOME: /root` in the e2e-tests job env so Firefox can launch inside the Playwright container without an `$HOME` ownership error; keep the workflow-level `env:` minimal so the unit-tests job (which runs on the bare runner as `runner`) doesn't break on `EACCES: permission denied, stat '/root/.gitconfig'` ([3f0f975](https://github.com/faddah/code-canvas-astro/commit/3f0f975), [6fd2bed](https://github.com/faddah/code-canvas-astro/commit/6fd2bed))
* enable `stdout: "pipe"` and `stderr: "pipe"` on Playwright's `webServer` config and raise the timeout to 180 s for better CI debugging ([dc62c0e](https://github.com/faddah/code-canvas-astro/commit/dc62c0e))
* harden `pretest:e2e` script — guard the `lsof` cleanup behind `!process.env.CI` since the Playwright container has no `lsof` ([260dab5](https://github.com/faddah/code-canvas-astro/commit/260dab5))
* per-engine `storageState` for Clerk + Playwright — each `authenticated-{chromium,firefox,webkit}` project depends on its own `setup-<engine>` and writes its own `e2e/.auth/<engine>.json` (required because Firefox / WebKit drop Clerk's `SameSite=None; Secure` cookies on plain HTTP) ([5ef7e9d](https://github.com/faddah/code-canvas-astro/commit/5ef7e9d), [979d964](https://github.com/faddah/code-canvas-astro/commit/979d964))
* add `BASE_URL` constant with HTTP/HTTPS branching driven by `process.env.CI` ([22968b5](https://github.com/faddah/code-canvas-astro/commit/22968b5), [6b2b945](https://github.com/faddah/code-canvas-astro/commit/6b2b945))
* add `E2E_CLERK_USER_USERNAME` / `E2E_CLERK_USER_PASSWORD` GitHub Actions secrets and wire them into the e2e job env ([821bbe6](https://github.com/faddah/code-canvas-astro/commit/821bbe6))
* `.env.test` support — `global-setup.ts` loads it locally via `process.loadEnvFile`, falls back to GitHub Actions secrets in CI ([0ad4ad9](https://github.com/faddah/code-canvas-astro/commit/0ad4ad9), [5a255e6](https://github.com/faddah/code-canvas-astro/commit/5a255e6))
* reduce Playwright workers from 3 to 2 to avoid dev-server overload races ([7419c26](https://github.com/faddah/code-canvas-astro/commit/7419c26))
* add `npm install -g npm@11` step / `npx -y npm@11 ci` to keep CI's npm version aligned with local development ([bc8ca37](https://github.com/faddah/code-canvas-astro/commit/bc8ca37), [9800b76](https://github.com/faddah/code-canvas-astro/commit/9800b76))
* `.gitignore` additions: `.certs/`, `e2e/.auth/`, log directories ([92f8450](https://github.com/faddah/code-canvas-astro/commit/92f8450), [3648fb2](https://github.com/faddah/code-canvas-astro/commit/3648fb2), [4594d64](https://github.com/faddah/code-canvas-astro/commit/4594d64))

### Dependencies

* upgrade Astro to v^6.1.7 ([8bd0e31](https://github.com/faddah/code-canvas-astro/commit/8bd0e31), [246fd73](https://github.com/faddah/code-canvas-astro/commit/246fd73))
* upgrade `@astrojs/node` to v^10.0.5 ([3e63386](https://github.com/faddah/code-canvas-astro/commit/3e63386))
* upgrade `@clerk/astro` to v^3.0.15 and `@clerk/react` to v^6.4.1 ([3e63386](https://github.com/faddah/code-canvas-astro/commit/3e63386))
* upgrade `@clerk/testing` to v^2.0.15 ([9f2840f](https://github.com/faddah/code-canvas-astro/commit/9f2840f))
* upgrade `@tanstack/react-query` to v^5.99.0 and `react-resizable-panels` to v^4.10.0 ([c8a32d8](https://github.com/faddah/code-canvas-astro/commit/c8a32d8))
* upgrade React to v^19.2.5, `react-dom` to v^19.2.5, `lucide-react` to v^1.8.0, `aws-cdk` to v^2.1118.0 ([60cb7ac](https://github.com/faddah/code-canvas-astro/commit/60cb7ac))
* upgrade `vitest` and `@vitest/coverage-v8` to v^4.1.4, `jsdom` to v^29.0.2 ([60cb7ac](https://github.com/faddah/code-canvas-astro/commit/60cb7ac))
* upgrade TypeScript to v^6.0.2, `@playwright/test` to v^1.59.1, `react-hook-form` to v^7.72.1, `eslint` to v^10.2.0 ([c219b9e](https://github.com/faddah/code-canvas-astro/commit/c219b9e))
* upgrade `autoprefixer` to v^10.5.0 ([5e873a9](https://github.com/faddah/code-canvas-astro/commit/5e873a9))
* add `concurrently` v^9.2.1 as a devDependency ([9f2840f](https://github.com/faddah/code-canvas-astro/commit/9f2840f))
* add `cross-fetch` v^4.1.0 as a dependency ([e63adb5](https://github.com/faddah/code-canvas-astro/commit/e63adb5))
* remove `local-ssl-proxy` (replaced by `e2e/https-proxy.mjs`) ([533345a](https://github.com/faddah/code-canvas-astro/commit/533345a))

### Docs for v2.3.0

* update `README.md` for v2.3.0 — Astro 6, TypeScript 6, expanded feature list, accurate project structure, new API endpoint table, Testing + CI sections ([33d379c](https://github.com/faddah/code-canvas-astro/commit/33d379c))
* add `IDE.tsx-Modularization-Test-Coverage-Plan.md` ([4c4c3d3](https://github.com/faddah/code-canvas-astro/commit/4c4c3d3))
* add and progressively complete `E2E-Coverage-Gaps-Remaining.md` (14 prioritized e2e coverage tasks, all marked DONE) ([b4030e4](https://github.com/faddah/code-canvas-astro/commit/b4030e4), [6673ecc](https://github.com/faddah/code-canvas-astro/commit/6673ecc))

### [2.2.1](https://github.com/faddah/code-canvas-astro/compare/v2.2.0...v2.2.1) (2026-04-01)

### Bug Fixes in v2.2.1

* pre-load micropip during Pyodide initialization with `pyodide.loadPackage("micropip")` — fixes `ModuleNotFoundError: No module named 'micropip'` when running scripts with third-party packages ([ed2a29d](https://github.com/faddah/code-canvas-astro/commit/ed2a29d))

## [2.2.0](https://github.com/faddah/code-canvas-astro/compare/v2.1.1...v2.2.0) (2026-04-01)

### Features in 2.2.0

* add PyPI package management — users can add/remove Python packages per project via the Explorer sidebar ([8e2b55f](https://github.com/faddah/code-canvas-astro/commit/8e2b55f))
* add `project_packages` database table with Drizzle ORM schema, list/create/delete methods in DatabaseStorage ([084d5bf](https://github.com/faddah/code-canvas-astro/commit/084d5bf))
* add API routes for packages — GET `/api/packages`, POST `/api/packages/create`, DELETE `/api/packages/[id]` with Clerk auth ([8e2b55f](https://github.com/faddah/code-canvas-astro/commit/8e2b55f))
* add `usePackages`, `useAddPackage`, `useRemovePackage` React Query hooks with retry/backoff ([e627344](https://github.com/faddah/code-canvas-astro/commit/e627344))
* integrate micropip into Pyodide `runCode()` — auto-installs project packages before executing Python code ([c9d8f34](https://github.com/faddah/code-canvas-astro/commit/c9d8f34))
* scope packages to the active project — packages are tied to the currently selected project in the Explorer ([482c339](https://github.com/faddah/code-canvas-astro/commit/482c339))
* show project name label in Packages section header in Explorer sidebar ([186d5c4](https://github.com/faddah/code-canvas-astro/commit/186d5c4))
* show install progress messages in console — "Installing numpy, pandas..." and "Installed 2 packages." ([e981f3d](https://github.com/faddah/code-canvas-astro/commit/e981f3d))
* add Package icon and Add Package dialog in ExplorerPane UI ([f8d56e6](https://github.com/faddah/code-canvas-astro/commit/f8d56e6))

### Bug Fixes in v2.2.0

* remove `Error.isError()` (ES2026 proposal) causing GitHub Actions CI failures — replaced with empty catch block ([30c3f78](https://github.com/faddah/code-canvas-astro/commit/30c3f78))
* fix `projectId` referenced before defined in packages index.ts API route ([90c46a0](https://github.com/faddah/code-canvas-astro/commit/90c46a0))
* expand catch error messaging in packages create.ts for better debugging ([b767872](https://github.com/faddah/code-canvas-astro/commit/b767872))

### Tests in v2.2.0

* add 12 unit tests for `usePackages`, `useAddPackage`, `useRemovePackage` hooks ([2a64618](https://github.com/faddah/code-canvas-astro/commit/2a64618))
* add 10 unit tests for Project Packages CRUD in DatabaseStorage ([5d8ab50](https://github.com/faddah/code-canvas-astro/commit/5d8ab50))
* add 4 Playwright e2e tests for packages API routes (401 auth checks, anonymous UI) ([fd7be2b](https://github.com/faddah/code-canvas-astro/commit/fd7be2b))
* add 2 ExplorerPane unit tests for project name label visibility ([17db853](https://github.com/faddah/code-canvas-astro/commit/17db853))
* add 3 use-pyodide unit tests for micropip install progress messages ([311655a](https://github.com/faddah/code-canvas-astro/commit/311655a))
* update ExplorerPane test helper with new package props ([5344376](https://github.com/faddah/code-canvas-astro/commit/5344376))
* update IDE-interactions test for new `runCode` 3-arg signature ([41b2384](https://github.com/faddah/code-canvas-astro/commit/41b2384))

### CI/CD in v2.2.0

* upgrade GitHub Actions — checkout v6, setup-node v6, upload-artifact v7, Node.js 22 ([9b3433e](https://github.com/faddah/code-canvas-astro/commit/9b3433e))
* increase Playwright worker processes from 1 to 2 for faster CI runs ([90db0bf](https://github.com/faddah/code-canvas-astro/commit/90db0bf))
* add separate build step before e2e tests, refactor webServer to use `npm run preview` in CI ([fe5d724](https://github.com/faddah/code-canvas-astro/commit/fe5d724))
* add `actions/cache@v5` for e2e test caching ([4bbaab1](https://github.com/faddah/code-canvas-astro/commit/4bbaab1))

### Dependencies in v2.2.0

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
