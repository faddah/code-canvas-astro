# Code Canvas Astro — What's New

A plain-language summary of what changed in each version of the app.

---

## Version 2.5.0 — April 25, 2026

### ARIA / accessibility instrumentation finished — every front-facing component now has WCAG 2.0 / 2.1 Level A + AA semantic markup, keyboard support, and automated axe-core tests

This release picks up where 2.4.0 left off and finishes the accessibility pass started there. 2.4.0 shipped the test infrastructure (axe-core + vitest-axe + @axe-core/playwright) and the first instrumented component (the loading screen). 2.5.0 instruments **every other front-facing component in the app** and lands the whole effort under a green Vitest + Playwright matrix.

#### What's new in the app

- **Console panel** — now announces itself as a live log region (`role="log"` + `aria-live="polite"` + `aria-label="Console output"`), so screen readers read out new lines as Python prints them.
- **Top nav bar** — proper `<header role="banner">` landmark, the action-button group is now an explicit `role="toolbar"` with a label ("File actions"), every icon-only button has an `aria-label`, the Python-environment status pill is its own polite live region, and every decorative Lucide icon is hidden from screen readers.
- **Explorer pane** —
  - The whole sidebar is now a proper `<aside role="complementary" aria-label="Explorer">` landmark.
  - The file/project tree uses `role="list"` + `role="listitem"` semantics so screen readers count and navigate items correctly.
  - The active file is marked `aria-current="true"` so assistive tech announces "current page" / "current file" on it.
  - **Project toggles became real `<button>` elements** (nested inside the row, not the whole row) with `aria-expanded` reflecting open/closed state, full Enter/Space keyboard handling, and an `aria-label` of the project name.
  - File items are reachable by Tab and openable by Enter or Space.
  - Every icon-only button (Trash2Btn, Add Package, package-remove, etc.) has a descriptive `aria-label` like `"Delete main.py"` or `"Confirm deleting project My Project"`.
  - Unsaved-changes indicators now have a hidden text equivalent ("unsaved changes") so screen readers announce the state, not just sighted users seeing a yellow dot.
- **All four modals** — `SaveDialog`, `OpenImportDialog`, `CompleteProfile`, `UserProfileModal`:
  - Every modal has a present `<DialogTitle>` AND `<DialogDescription>` (Radix's accessibility contract).
  - Every form input has a real `<Label htmlFor="…">` paired with a matching `id` on the input — no orphan labels.
  - Every validated field is wired with `aria-invalid` and `aria-describedby` pointing at its specific error paragraph, so screen readers announce "invalid entry" on focus AND read the actual error message.
  - The old `aria-describedby={undefined}` workarounds (originally added to silence Radix warnings before descriptions existed) have been removed where descriptions now exist.
- **File tabs** — proper `role="tablist"` / `role="tab"` / `role="tabpanel"` triad in the editor panel:
  - The tab bar is a `role="tablist"`.
  - Each tab has `role="tab"` + `aria-selected` reflecting active state, and is reachable by Tab.
  - Pressing Enter or Space activates a tab; pressing Delete closes it (matching how browser tab bars work).
  - The Monaco editor area is a `role="tabpanel"` whose `aria-label` updates with the active filename.
- **Resizable panel handles** in the editor / preview / console area now have meaningful `aria-label`s ("Resize editor and output panels", "Resize preview and console panels") so keyboard users know what each separator is for.
- **Error boundary** — when something crashes, the fallback now uses `role="alert"`, which interrupts whatever the screen reader is currently saying. App-crash level news deserves to interrupt.
- **Web Preview** — wrapped in a proper `role="region" aria-label="Web Preview"` landmark, so screen-reader users can navigate to it as a distinct section.
- **IDE main layout** — gets `role="main"` so the central content area is reachable as the page's main landmark.
- **Pre-React loading splash (in `Layout.astro`)** — the brief loading spinner shown before React hydrates now has `role="status"` + `aria-live="polite"`, so a screen-reader user landing on the page hears "Loading Python REPL IDE..." immediately instead of silence.
- **404 page** — was previously a bare `<div>` fragment with no language, no `<title>`, no `<main>` landmark. Now it's a full HTML document (`<html lang="en">` + `<head>` + `<title>` + `<main>`) with the alert icon properly hidden from screen readers (the heading text already conveys "404 Page Not Found").

#### The big internal restructure: project toggle rows

The tricky one. The first attempt at the project-row toggle put `role="button"` directly on the outer drag-drop `<div>`. Two problems collided:

1. ARIA spec says `aria-expanded` is only valid on specific widget roles — it can't live on a plain `<div>` unless that div has one of those roles.
2. Headless CI browsers silently drop `drop` events sent to elements with `role="button"`, so when we did add `role="button"` to make `aria-expanded` legal, the drag-drop e2e tests started moving files to the wrong place (project id `null` instead of the target project).

The final shape: the **outer `<div>`** keeps the `group` CSS class and handles drag-drop and clicks, while a **nested native `<button>`** carries `aria-expanded`, `aria-label`, `tabIndex`, and the keyboard handler. Visual / drop-target container vs. semantic interactive element — cleanly separated. axe is happy, Playwright drag-drop works in all three browsers, screen readers announce the correct widget semantics.

#### Test coverage and quality

- **26 new accessibility-specific tests** across `LoadingScreen.test.tsx` (3), `TopNavBar.test.tsx` (7), and `ExplorerPane.test.tsx` (16) — every one running real `axe-core` audits on the rendered DOM and asserting `toHaveNoViolations()`. (An earlier version of these tests called `axeCheck(...)` without asserting on the result — Sourcery rightly caught it; fixed in this release.)
- The "shows loading state" Vitest test was rewritten to use `getByRole("status")` instead of looking for text that doesn't exist in the component.
- Several Vitest tests updated to find the project toggle via `screen.getByLabelText("My Project")` now that it's an explicit button with that aria-label.
- Several Playwright e2e tests had locators tightened — `[aria-label='Second Project']` instead of `text=Second Project` (which now also matches via `aria-label` substring), `#save-file-name-error` instead of error text (which can collide with the new `<DialogDescription>`), and `button[aria-label^='Delete project']` to disambiguate the trash button from the new project-toggle button.
- **Final result:** 608 / 608 Vitest unit tests passing, 396 / 396 Playwright e2e tests passing across Chromium, Firefox, and WebKit.

#### CI / dev environment fixes that came up along the way

- The GitHub Actions `e2e-tests` job timeout was raised from 15 → 25 minutes; the previous ceiling was occasionally hit when retries on borderline-flaky tests stacked up.
- Per-engine timeouts in `playwright.config.ts` were increased so Clerk auth has more room in CI (Clerk's HTTPS handshake can be slow under headless load).
- The Astro dev toolbar is now disabled when `process.env.PLAYWRIGHT === "true"` so it doesn't interfere with e2e tests.

#### Bug fixes (incl. Sourcery code-review findings)

- Removed a stray `<DropdownMenu>` token that had been sitting inside the FolderOpen icon's `className` (`"w-4<DropdownMenu> h-4"`) — pre-existing typo from before the a11y work. Caught by Sourcery, fixed.
- Widened the `onClose` prop type on `<FileTab>` to accept both `React.MouseEvent` and `React.KeyboardEvent` so Delete-key tab close works.
- Tightened the e2e save-flow validation locator to `#save-file-name-error` since the new `<DialogDescription>` now contains the same string as the error message would.

#### Code quality

- Explicit `JSX.Element` return types on `FileTab(...)` and `getFileIcon(name)`.
- Dropped unused `useRef` import in `ExplorerPane.tsx`.
- Added a `TODO` comment in `EditorPanel.tsx` flagging the duplication between its local `FileTab` and `src/components/FileTab.tsx` for a future consolidation pass.

#### Dependency updates

- `@tanstack/react-query` v5.99.1

#### Docs

- README, CHANGELOG, and CHANGELOG-simple updated for v2.5.0.

---

## Version 2.4.0 — April 18, 2026

### Accessibility testing infrastructure, and the first ARIA-instrumented component

This release starts a new accessibility initiative in the app. Two-part story — a testing foundation so every future component can be verified against WCAG 2.0 / 2.1 Level A + AA rules, and the first component (the loading screen) properly wired up for screen readers.

#### What's new in the app

- **Screen-reader-friendly loading screen** — the `<LoadingScreen>` component now announces itself to assistive technology while it's on screen. The loading message is marked `role="status"` + `aria-live="polite"` so the text is read aloud when it appears or changes; the decorative spinner is marked `aria-hidden` so screen readers don't repeatedly announce an animation nobody can see. This is the first of several planned component-by-component accessibility passes — more to follow in subsequent 2.4.x releases

#### New accessibility testing foundation

- **Unit-level a11y checks** — added `vitest-axe` so any component test can assert `await axeCheck(container)` and fail the build on WCAG 2.0 / 2.1 A + AA violations. `src/test/helpers/a11y.ts` wraps it with the exact rule set we're targeting (the `color-contrast` check is disabled under jsdom because jsdom can't compute styles — we'll catch contrast issues at the e2e layer instead)
- **End-to-end a11y checks** — added `@axe-core/playwright` so any Playwright test can run an axe audit against the live DOM in a real browser. This is where color-contrast and anything requiring layout / computed styles gets verified
- **Shared rule engine** — `axe-core` itself is the WCAG rule engine behind both harnesses, so unit tests and e2e tests agree on what "accessible" means
- **Hands-off global setup** — `src/test/setup.ts` imports the a11y helper so `toHaveNoViolations()` is registered on every Vitest suite with zero per-test ceremony
- **First instrumented component** — `src/components/LoadingScreen.tsx` was instrumented and gets its own axe audit + ARIA unit assertions in `src/test/components/LoadingScreen.test.tsx`

#### Playwright stability fixes that landed alongside

Getting the e2e suite to 396 / 396 clean across Chromium, Firefox, and WebKit required three targeted fixes that ride along with this release:

- **Hardened Clerk authentication setup** — `e2e/auth.setup.ts` now waits on `window.Clerk.loaded === true` explicitly (with a 60 s timeout and a detailed diagnostic payload on failure) instead of using the Clerk testing helper's `clerk.loaded({ page })`, which gave opaque timeouts. Also raised the whole setup's budget to 90 s. The original 30 s wait was masking a silent cause — see the environment note below
- **Firefox delete-flow de-flake** — the User Profile "Delete Profile" confirmation dialog is a Radix `AlertDialog` that renders through a portal. The old tests waited on `text=Delete Account`, which races Firefox's portal paint. New code waits on `[role="alertdialog"]` (Radix sets this synchronously on mount) with a 20 s timeout, then scopes subsequent text / button locators inside that dialog
- **WebKit console-output de-flake** — the console-output test was combining a class-based locator and a `hasText` filter into one assertion, which coupled two timings into a single race. Split into two assertions (wait for the text, *then* assert the red-error class) for better diagnostics and more tolerance of slow paint

#### Environment / setup note

- **Clerk keys** — local development and CI must use Clerk **Development** instance keys (`pk_test_…` / `sk_test_…`). Production keys (`pk_live_…` / `sk_live_…`) are domain-locked to the production host and silently fail on `localhost` — `Clerk.load()` never completes, the page looks signed-out-but-broken, and e2e auth setup times out with no obvious cause. The `.env.test` file and the GitHub Actions secrets both use the Development instance

#### Dependency additions

- Added (devDependencies): `vitest-axe` v0.1.0, `axe-core` v4.11.3, `@axe-core/playwright` v4.11.2
- No runtime dependency changes

---

## Version 2.3.0 — April 16, 2026

### IDE.tsx broken into focused modules, big test-coverage push, and a much faster, more reliable CI pipeline

This release is a large refactor / quality push. The user-facing app behaves the same as 2.2.1 in most places, but the internals are dramatically more modular, the test suite is substantially larger, and the GitHub Actions pipeline now runs the full Vitest unit suite plus the full Playwright e2e suite (Chromium, Firefox, and WebKit) reliably and quickly. Highlights:

#### What's new in v2.3.0 for the app

- **Better loading experience** — added a dedicated `<LoadingScreen>` component that shows a "Taking too long? Reload" button after a configurable timeout. Backed by a new `useLoadingStateCleanup` hook that tracks how long loading has been going so the screen can react instead of just spinning forever
- **Profile-completion modal can be dismissed** — the "Complete Your Profile" modal now properly closes when you click Cancel or finish the form, instead of stubbornly re-appearing
- **Accessibility fix in the Command palette** — added a hidden `<DialogTitle>` so screen readers announce the palette correctly
- **Better mobile layout** — Explorer header is now hidden on small (mobile-sized) viewports
- **Long filenames are truncated cleanly in the Explorer** — they no longer break the sidebar layout

#### Big internal refactor — `IDE.tsx` broken into modules

The monolithic `src/components/IDE.tsx` has been split into focused, individually-testable hooks and components:

- New hooks: `useAuthState`, `useClerkUser`, `useFileManagement`, `useKeyboardShortcuts`, `useProjectData`, `usePackageData`, `usePythonExecution`, `useLoadingStateCleanup`
- New components extracted from `IDE.tsx`: `<TopNavBar>`, `<EditorPanel>`, `<ExecutionPanel>`, `<LoadingScreen>`

This makes the IDE much easier to reason about, test, and extend. No user-facing behavior changes from the refactor itself.

#### Massive test-coverage expansion

- New Vitest unit tests for every hook listed above, plus `use-toast`, the `cn()` Tailwind helper, and the new components (`EditorPanel`, `ExecutionPanel`, `TopNavBar`, `LoadingScreen`)
- New Vitest unit tests for every API route: `/api/health`, `/api/files`, `/api/user-files`, `/api/projects`, `/api/packages`, `/api/starter-files`, `/api/user-profile`
- New Vitest helpers — `mock-storage.ts`, `mock-api-context.ts`, `response-helpers.ts` — so route tests are short and uniform
- A pile of new Playwright end-to-end specs covering: Clerk sign-in setup, profile completion, project CRUD, package management, file drag-and-drop, file delete, loading-screen reload button, Explorer error state with Retry, Escape-closes-dialogs, console output, the User Profile modal (8 view/edit/delete tests), the New File dialog, the Save As dialog, `Cmd+S` / `Ctrl+S` keyboard save, panel resizing via drag handles, mobile vs desktop responsive layout, and IDE Console + Web Preview interactions
- Tracked all 14 prioritized e2e coverage gaps in `E2E-Coverage-Gaps-Remaining.md` and finished every one of them

#### CI / test infrastructure overhaul

- **HTTPS everywhere** — local dev and CI preview now both run under HTTPS. This was required to make Firefox and WebKit accept Clerk's `SameSite=None; Secure` session cookies
- **Self-signed local TLS certs** — generated under `.certs/` (gitignored). CI generates them on the fly via `openssl`
- **Switched the e2e CI job to the official Playwright Docker container** (`mcr.microsoft.com/playwright:v1.59.1-noble`) — Node 22 and all three browsers come pre-installed. This eliminates a ~29-minute `npx playwright install --with-deps` step that was the slowest part of every CI run
- **New `npm run preview:ci` script** that uses `concurrently` to run `astro preview` and a custom HTTPS reverse proxy in parallel
- **Custom HTTPS proxy** — `e2e/https-proxy.mjs`, a tiny Node reverse proxy that targets `127.0.0.1:4322` directly. Replaces the old `local-ssl-proxy` package, which was dropping connections in CI due to IPv6/IPv4 DNS resolution mismatches
- **Per-browser-engine Clerk auth** — each `authenticated-{chromium,firefox,webkit}` Playwright project depends on its own `setup-<engine>` step and writes its own `e2e/.auth/<engine>.json` storageState. Without this, Firefox and WebKit silently drop Clerk's secure cookies and every authenticated test fails
- **`.env.test` support** — `e2e/global-setup.ts` loads it locally if present and falls back to GitHub Actions secrets in CI; required env vars are validated up front so you get a clear error instead of a cryptic Clerk 401 mid-test
- **Container compatibility fixes** — `HOME: /root` set on the e2e job (so Firefox can launch inside the container without an `$HOME` ownership error), `pretest:e2e` guarded behind `!process.env.CI` (the Playwright container has no `lsof`), `stdout`/`stderr` piped from the webServer, and the webServer timeout raised to 180 s for better CI debugging
- **Workflow-level `env:` kept minimal** — the unit-tests job runs on the bare runner as `runner`, so `HOME: /root` lives only on the e2e-tests job to avoid a `permission denied, stat '/root/.gitconfig'` failure during checkout
- **GitHub Actions secrets added** — `E2E_CLERK_USER_USERNAME` / `E2E_CLERK_USER_PASSWORD`. Use Clerk **Development** keys (`pk_test_…` / `sk_test_…`) — the Production keys are domain-locked to `pyrepl.dev` and won't work on `localhost`
- **Reduced Playwright workers from 3 to 2** to avoid race conditions where the dev server couldn't keep up under heavy parallel load with 7 projects
- **Build cache** — added `actions/cache@v5` for the Astro build output (`dist/`, `node_modules/.astro`)
- **npm version alignment** — CI now uses `npx -y npm@11 ci` to match the local environment, fixing rollup-related `npm ci` failures

#### Bug fixes & code modernization

- Replaced deprecated React `ElementRef` with the modern `ComponentRef` across all UI components
- Switched test selectors from fragile CSS classes to stable `data-testid` / `data-active` attributes for file tabs
- Refactored `<Calendar>` chevron icons (`IconLeft` / `IconRight` → `Chevron`) to match the latest `react-day-picker` API
- Hardened `tailwind.config.ts` (`darkMode: ["class"]` → `darkMode: "class"`)
- Updated `tsconfig.json` for TypeScript 6.x — explicit `extends` path, plus `target: "ESNext"`, `moduleDetection: "force"`, `moduleResolution: "Bundler"`
- Excluded `e2e/` from the main TypeScript program and gave Playwright its own `e2e/tsconfig.json` to silence cross-project compile errors
- Added `aria-describedby={undefined}` to several `<DialogContent>` elements to silence Radix dialog warnings during Vitest runs

#### Dependency updates

- Astro v6.1.7 (was v6.1.5)
- `@astrojs/node` v10.0.5
- `@clerk/astro` v3.0.15, `@clerk/react` v6.4.1, `@clerk/testing` v2.0.15
- `@tanstack/react-query` v5.99.0, `react-resizable-panels` v4.10.0
- React + `react-dom` v19.2.5, `lucide-react` v1.8.0, `aws-cdk` v2.1118.0
- Vitest + `@vitest/coverage-v8` v4.1.4, `jsdom` v29.0.2
- TypeScript v6.0.2, `@playwright/test` v1.59.1, `react-hook-form` v7.72.1, `eslint` v10.2.0
- `autoprefixer` v10.5.0
- Added: `concurrently` v9.2.1 (devDep), `cross-fetch` v4.1.0
- Removed: `local-ssl-proxy` (replaced by `e2e/https-proxy.mjs`)

#### Docs

- README rewritten to reflect Astro 6, TypeScript 6, the new feature set, the actual current project structure, the full API endpoint table, and brand-new Testing and Continuous Integration sections
- Added `IDE.tsx-Modularization-Test-Coverage-Plan.md` for tracking the modularization effort
- Added (and progressively completed) `E2E-Coverage-Gaps-Remaining.md` — all 14 prioritized e2e gaps now closed

---

## Version 2.2.1 — April 1, 2026

### micropip loading fix

- Fixed third-party package installation failing with `ModuleNotFoundError: No module named 'micropip'` — micropip is included in the Pyodide distribution but wasn't being loaded before use. Added `pyodide.loadPackage("micropip")` during Pyodide initialization so it's always available when scripts need to install PyPI packages.

---

## Version 2.2.0 — April 1, 2026

### PyPI package management, project-scoped packages, and install progress

- Added a full package management system — users can now add and remove Python (PyPI) packages for their projects directly from the Explorer sidebar
- Created the `project_packages` database table and all CRUD methods (add, list, remove) in the storage layer using Drizzle ORM
- Built three new API routes: GET `/api/packages` (list), POST `/api/packages/create` (add), and DELETE `/api/packages/[id]` (remove), all protected with Clerk authentication
- Created React Query hooks (`usePackages`, `useAddPackage`, `useRemovePackage`) with retry and exponential backoff
- Integrated micropip into Pyodide — when you click Run, project packages are automatically installed before your Python code executes
- Packages are scoped to the active project — switching projects shows that project's packages, and adding a package ties it to the current project
- Added a project name label in the Packages section header so you always know which project's packages you're looking at
- Console now shows install progress messages: "Installing numpy, pandas..." followed by "Installed 2 packages." so you know what's happening
- Added an "Add Package" dialog in the Explorer with a text input for PyPI package names
- Fixed `Error.isError()` usage that was failing in GitHub Actions CI (ES2026 proposal not yet available in Node.js)
- Upgraded GitHub Actions: checkout v6, setup-node v6, upload-artifact v7, Node.js 22, added caching, increased Playwright workers to 2
- Updated dependencies: @clerk/astro, @clerk/react, @clerk/testing, @tanstack/react-query, @playwright/test, playwright, aws-cdk, TypeScript v5.9.3
- Wrote 31 new tests: 12 for package hooks, 10 for database CRUD, 4 Playwright e2e tests, 2 for Explorer UI, 3 for install progress messages

---

## Version 2.1.1 — March 30, 2026

### Playwright test reliability fix & dependency updates

- Fixed Playwright end-to-end tests stalling indefinitely — the root cause was a stale Astro dev server on port 4321 that was returning 500/504 errors, preventing Playwright from ever starting its test run
- Added a `pretest:e2e` npm script that automatically kills any existing process on port 4321 before running e2e tests, so you always get a clean server
- Changed Playwright's `reuseExistingServer` from `true` (local) to `false` — Playwright now always starts a fresh Astro dev server instead of reusing a potentially broken one
- Refactored `astro.config.mjs` to use the new `defineConfig` import from `astro/config` (replacing the old `createRequire` from `node:module`), matching Astro 6.1.1's updated API
- Updated Astro to v6.1.2 (was v6.1.1)
- Updated drizzle-orm to v0.45.2 and drizzle-kit to v0.31.10 (was v0.18.1)
- Corrected aws-cdk to v2.1115.0 (was incorrectly set to v3.0.0)
- Updated react-resizable-panels to v4.8.0
- Updated lucide-react to v1.7.0

---

## Version 2.1.0 — March 27, 2026

### Save/Open dialogs, project management, and Explorer drag-and-drop

- Added a Save Dialog that opens with Cmd+S (Mac) or Ctrl+S (Windows/Linux), with file name editing and project assignment
- Added an Open/Import Dialog for importing .py and .txt files from your local filesystem into the IDE or into a specific project
- Only .py and .txt files can be saved or imported (enforced in both dialogs)
- Created full Project management: create projects in the Explorer, group files under projects, and delete projects
- Explorer pane now shows projects as collapsible folders with nested files underneath
- Drag-and-drop support: drag files into projects or out to the general Explorer area
- Added "Open / Import" button in the toolbar (visible when signed in)
- Built project API routes (list, create, update, delete) with full authentication
- Created React Query hooks for project CRUD and file-to-project assignment
- Wrote comprehensive unit tests (vitest) for all new hooks and components
- Wrote end-to-end integration tests (Playwright) for explorer, dialogs, and project API routes

---

## Version 2.0.1 — March 26, 2026

### Astro 6 & Vite 7 compatibility fixes

- Fixed compatibility issues with Astro 6 and Vite 7 (pinned Vite to 7.3.1 since TailwindCSS tried to force Vite 8, which Astro doesn't support yet)
- Fixed the release/versioning scripts so they run without errors
- Cleaned up test configuration and `.gitignore`

---

## Version 2.0.0 — March 26, 2026

### Projects feature (new database table)

- Added a brand-new "Projects" table to the Turso database, so files can be organized into projects
- Created full API routes (create, read, update, delete) for managing projects
- Added an `updatedAt` timestamp when files are edited
- Wrote unit tests for the new Projects feature
- Downgraded Astro from 6.1.0 back to 6.0.8 due to install errors

---

## Version 1.7.0 — March 26, 2026

### Testing infrastructure

- Set up Vitest for unit testing and Playwright for end-to-end (browser) testing
- Created a full test suite: database tests, API route tests, React component tests (ConsolePanel, WebPreview), hook tests (file management, Pyodide, user profiles), and schema validation tests
- Added GitHub Actions workflow so tests run automatically on every push
- Created a Pyodide stub so Python-related tests can run in Node.js

---

## Version 1.6.0 — March 16, 2026

### Console input support (Python `input()` works!)

- Python's `input()` function now works in the browser console, powered by JSPI (JavaScript Promise Integration)
- When a Python script calls `input()`, a text field appears in the console for users to type their response
- Upgraded Pyodide to version 0.27.7
- Added fallback for browsers that don't support JSPI (uses `window.prompt()` instead)

---

## Version 1.5.2 — March 14, 2026

### Profile modal fix & file loading reliability

- Fixed the "Complete Profile" modal — the Cancel/X button was broken and users were trapped in the dialog
- Fixed user files not loading after sign-in (query was missing the userId key, and had no retry logic)
- Added error and empty-state messages in the file Explorer sidebar
- Added Clerk authentication keys to the Lambda environment

---

## Version 1.5.1 — March 12, 2026

### Login & profile reliability

- Fixed a race condition where two Lambda instances could create duplicate user profiles at the same time
- Improved profile loading — the app now waits for a confirmed server response before showing the profile, instead of just checking "not loading"
- Added automatic retries with increasing delays (1s, 2s, 4s) when API calls fail
- Updated several npm packages

---

## Version 1.5.0 — March 11, 2026

### Static assets served from S3

- Static files (CSS, JS, images) are now extracted from the Docker container and uploaded to an S3 bucket, so they load faster and more reliably via CloudFront
- The AWS deployment script is now a 12-stage pipeline (was 11)
- Improved error handling in the deployment script

---

## Version 1.4.1 — March 10, 2026

### Blank page fix & loading improvements

- Fixed the dreaded blank page on first load — the Lambda handler was sending wrong HTTP headers (`transfer-encoding: chunked`) that Safari and Firefox couldn't handle
- Added an error boundary so the app shows a helpful message instead of a white screen if something crashes
- Added a loading spinner and a "Taking too long? Reload" button
- Added automatic retries (3 attempts) for API calls with increasing delays
- Prevented browsers from caching error responses

---

## Version 1.4.0 — March 9, 2026

### Authentication on page refresh & CloudFront caching fix

- Fixed a bug where refreshing the page would briefly show you as logged out, clearing your files and then re-fetching them (flickering)
- Added smart detection of real login/logout vs. page refresh using a ref to track previous auth state
- Created a CloudFront cache policy script to fix caching behavior
- Added server-side logging of cookies and HTTP status codes for debugging
- Fixed the database WAL (write-ahead log) flushing so data isn't lost

---

## Version 1.3.0 — March 4, 2026

### User accounts & profiles (Clerk authentication)

- Added user authentication with Clerk — users can now sign up, log in, and have their own saved files
- Created separate database tables for starter files (shown to everyone) and user files (private, per-user)
- Built a "Complete Profile" dialog for new users and a "User Profile" modal for viewing/editing profile info
- Created new API routes for user files and user profiles
- Rewrote the file management hooks to support both anonymous (starter files) and authenticated (user files) modes

---

## Version 1.2.6 — February 23, 2026

### Small UI polish

- Footer copyright year now updates automatically instead of being hardcoded
- Styled the footer link (navy blue, dodger blue on hover)

---

## Version 1.2.5 — February 22, 2026

### Explorer footer & new favicon

- Added a footer at the bottom of the Explorer file list with copyright info, business name, and a feedback email link
- New favicon for the app
- Updated the README screenshot

---

## Version 1.2.4 — February 21, 2026

### File deletion finally works

- Fixed file deletion — it was being blocked by Astro 5's built-in CSRF protection (`checkOrigin`), which rejected DELETE requests that had no `Origin` header
- Added the `<Toaster>` component so success/error notifications actually appear (they were silently dropped before)
- Enabled SQLite WAL mode for better database performance
- Improved error handling and messaging for the delete operation
- Simplified the Docker entrypoint script

---

## Version 1.2.3 — February 21, 2026

### File save fix & UI refactoring

- Fixed the file save function so edits are properly persisted
- Refactored many UI components for better React rendering patterns
- Fixed click handling on delete confirmation and cancel buttons

---

## Version 1.2.2 — February 21, 2026

### Delete button UX & AWS API Gateway fix

- Fixed the delete confirmation button so it resets back to the trash icon after confirming
- Added a visible error toast when file deletion fails (previously errors were silently swallowed)
- Fixed the AWS deployment script — it was using the wrong API Gateway client (REST API v1 instead of HTTP API v2), which caused verification to fail
- Fixed Docker Hub login in the deployment script
- Added `standard-version` for automated changelog and version tagging

---

## Version 1.2.1

### AWS deployment script

- Created `update_aws_deployment.py` — a comprehensive Python script using Boto3 to deploy the Docker container to Docker Hub, AWS ECR, and the full AWS service chain (Lambda, API Gateway, CloudFront, Route 53)
- Updated several npm packages

---

## Version 1.2.0

### AWS infrastructure (Route 53, CloudFront, API Gateway)

- Created AWS CDK deployment script for Route 53, CloudFront, and Certificate Manager to put the app behind the `pyrepl.dev` domain
- Created shell scripts for setting up API Gateway and fixing CloudFront configuration
- Built the CloudFront-to-API-Gateway-to-Lambda pipeline so the app is publicly accessible

---

## Version 1.1.0

### Docker & Lambda deployment

- Created the Docker container setup (Dockerfile, docker-compose, entrypoint script) for running the Astro app
- Built the Lambda handler so the app can run as a serverless function on AWS
- Created the initial Python deployment scripts for pushing to ECR and Lambda
- Set up database initialization and seeding scripts for the Docker environment
- Created deployment documentation

---

## Version 1.0.0 (Initial Release)

### The Astro migration

- Migrated the entire app from a React-only project to Astro with server-side rendering
- Set up the core stack: Astro + React + TailwindCSS + Drizzle ORM + SQLite (Turso)
- Built the IDE interface: file Explorer sidebar, Monaco code editor with tabs, Python console (via Pyodide), and web preview panel
- Created API routes for file CRUD operations
- Built the resizable panel layout (editor, console, web preview)
- Set up the database schema and storage layer
