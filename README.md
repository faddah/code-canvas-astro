# Code Canvas — Python REPL IDE

![Python REPL IDE App Screen Shot](https://github.com/faddah/code-canvas-astro/raw/main/public/python-repl-ide-app-screenshot.png)

**Current Version:** 2.4.0

A full-stack web-based IDE for executing Python code with an integrated REPL (Read-Eval-Print Loop). Built on **Astro 6** with server-side rendering, React 19 interactive islands, Clerk authentication, and a **Turso** (libSQL) cloud database. The app provides a modern development environment with a file explorer, Monaco code editor, console panel, live web preview, project management, and package installation.

## Overview

This project started with inspiration from [Replit's](https://replit.com) "vibe coding" approach and has been customized with my own tweaks and adjustments to create a powerful, user-friendly Python development environment for the web. It was originally built with Vite + Express, migrated to a full-stack **Astro 5** architecture, and has now been upgraded to **Astro 6** — Astro handles routing, SSR, API endpoints, and static asset serving top-to-bottom, with Clerk providing authentication and per-user data scoping.

## Features

### Core IDE

- **Python REPL** — Execute Python code directly in the browser via Pyodide
- **Monaco Editor** — Full VS Code-quality code editing with syntax highlighting and IntelliSense
- **Console Panel** — View stdout, stderr, and debug output in real-time with `[Error]`-prefixed red styling
- **Web Preview** — Instantly render HTML output from your code
- **Resizable Panels** — Drag to resize the editor, console, and preview panes
- **Keyboard Shortcuts** — `⌘S` / `Ctrl+S` to save, `Esc` to close dialogs, and more
- **Responsive UI** — Explorer collapses on small viewports for a mobile-friendly layout

### Files & Projects

- **File Explorer** — Create, rename, delete, and drag-and-drop files backed by a Turso cloud database
- **Projects** — Group files into named projects, switch between them from the top nav bar
- **Starter Files** — Built-in starter templates to get new users up and running quickly
- **Save / Open / Import Dialogs** — Save snapshots, open existing projects, import local files
- **Long filename truncation** — Explorer keeps long names readable without breaking layout

### Authentication & User Management

- **Clerk Authentication** — Sign-up, sign-in, and session management via [Clerk](https://clerk.com)
- **User Profiles** — Profile completion flow with dismissible prompt and modal edit UI
- **Per-User Data** — Files and projects scoped to the signed-in user

### Python Package Management

- **Package Manager UI** — Install and manage Pyodide-compatible Python packages per project
- **Package Persistence** — Installed packages stored per project in Turso

### Reliability

- **Error Boundary** — React error boundary catches runtime errors and displays a recovery UI
- **Loading States** — Dedicated loading screen with timeout handling for slow network conditions
- **HTTPS Everywhere** — Local dev and preview both run under HTTPS (required for modern auth cookies)

### Accessibility

- **WCAG 2.0 / 2.1 A + AA automated testing** — every unit test can call `axeCheck()` and every e2e test can run an axe audit against the live DOM
- **Instrumented components** — ARIA attributes added systematically per component; `<LoadingScreen>` was first (`role="status"` + `aria-live="polite"` on the message, `aria-hidden` on the decorative spinner)

### Deployment

- **Docker Support** — Multi-stage containerized builds with Docker Compose
- **AWS Deployment** — Automated 12-stage deployment pipeline (ECR, Lambda, API Gateway v2, CloudFront, Route 53)

## Tech Stack

### Full-Stack Framework

- **[Astro 6](https://astro.build)** — SSR framework with `output: 'server'` mode and the `@astrojs/node` adapter
- **[React 19](https://react.dev)** — Interactive UI islands via `@astrojs/react`
- **[TypeScript 6](https://www.typescriptlang.org)** — Type-safe development across the entire stack

### Frontend

- **[Tailwind CSS 4](https://tailwindcss.com)** — Utility-first styling via the `@tailwindcss/vite` plugin
- **[shadcn/ui](https://ui.shadcn.com)** — Radix UI-based component library
- **[Monaco Editor](https://microsoft.github.io/monaco-editor/)** — VS Code's editor in the browser
- **[TanStack React Query](https://tanstack.com/query)** — Server state management and caching
- **[Pyodide](https://pyodide.org)** — CPython compiled to WebAssembly for in-browser Python execution
- **[Framer Motion](https://www.framer.com/motion/)** — Animation library
- **[React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev)** — Form state + runtime validation
- **[Lucide React](https://lucide.dev)** — Icon library

### Backend

- **[Astro API Routes](https://docs.astro.build/en/guides/endpoints/)** — REST endpoints under `src/pages/api/`
- **[Drizzle ORM](https://orm.drizzle.team)** — Type-safe SQL query builder
- **[Turso](https://turso.tech)** — Cloud-hosted libSQL database (remote SQLite-compatible)
- **[@libsql/client](https://github.com/tursodatabase/libsql-client-ts)** — TypeScript client for Turso/libSQL
- **[Clerk](https://clerk.com)** — Authentication and user management (`@clerk/astro`, `@clerk/react`)

### Testing

- **[Vitest 4](https://vitest.dev)** — Unit tests for hooks, components, API routes, utilities
- **[@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/)** — Component testing
- **[Playwright](https://playwright.dev)** — End-to-end tests across Chromium, Firefox, and WebKit
- **[@clerk/testing](https://clerk.com/docs/testing/playwright/overview)** — Automated Clerk sign-in in e2e tests
- **[vitest-axe](https://github.com/chaance/vitest-axe)** — jest-axe bindings for Vitest; adds `toHaveNoViolations()` for unit-level a11y assertions
- **[@axe-core/playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)** — axe-core bindings for Playwright; e2e-level a11y audits against the live DOM
- **[axe-core](https://github.com/dequelabs/axe-core)** — WCAG 2.0 / 2.1 A + AA accessibility rule engine (shared by both harnesses)

### DevOps

- **Docker** — Multi-stage Debian Bookworm Slim builds
- **Docker Compose** — Single-service app container with Turso cloud DB
- **GitHub Actions** — CI runs Vitest unit tests and Playwright e2e tests (all three browsers) on every push and PR
- **AWS** — ECR, Lambda, API Gateway v2, CloudFront, Route 53

## Getting Started

### Prerequisites

- **Node.js** v22 or higher
- **npm** v10 or higher
- **A Turso account** — [turso.tech](https://turso.tech) (free tier available)
- **A Clerk account** — [clerk.com](https://clerk.com) (free tier available)
- **Docker** (optional, for containerized development/deployment)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/faddah/code-canvas-astro.git
   cd code-canvas-astro
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the project root:

   ```bash
   TURSO_DATABASE_URL=libsql://your-db-name-your-org.turso.io
   TURSO_AUTH_TOKEN=your-turso-auth-token
   PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your-clerk-publishable-key
   CLERK_SECRET_KEY=sk_test_your-clerk-secret-key
   ```

   To get your Turso credentials:

   ```bash
   turso db show your-db-name --url
   turso db tokens create your-db-name
   ```

   Clerk publishable and secret keys come from your Clerk dashboard. Use **Development** keys (`pk_test_…` / `sk_test_…`) for `localhost`; production keys are domain-locked.

4. **Generate local HTTPS certs** (required for Clerk cookies in all browsers)

   ```bash
   mkdir -p .certs
   openssl req -x509 -nodes -newkey rsa:2048 \
     -keyout .certs/localhost+2-key.pem \
     -out .certs/localhost+2.pem \
     -days 30 \
     -subj "/CN=localhost" \
     -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
   ```

5. **Push the schema to Turso**

   ```bash
   npm run db:push
   ```

6. **Start the development server**

   ```bash
   npm run dev
   ```

   The application will be available at `https://localhost:4321`.

### Docker Setup

To run the application in Docker:

```bash
docker-compose up --build
```

This starts a single container:

- **app** — Builds and runs the production Astro server on port 3000, connecting to your Turso cloud database via environment variables

The database lives in Turso's cloud — no local volumes or initialization containers needed.

## Project Structure

```bash
code-canvas-astro/
├── .github/
│   └── workflows/
│       └── test.yml               # CI: unit-tests + e2e-tests jobs
├── e2e/                           # Playwright end-to-end tests
│   ├── *.spec.ts                  # Anonymous-user specs
│   ├── *.auth.spec.ts             # Signed-in specs (depend on auth.setup.ts)
│   ├── auth.setup.ts              # Clerk sign-in, persists storageState per engine
│   ├── global-setup.ts            # Loads env, calls clerkSetup()
│   ├── https-proxy.mjs            # Custom HTTPS → HTTP reverse proxy for CI preview
│   ├── helpers.ts                 # Shared test helpers
│   └── fixtures/                  # Test fixtures
├── migrations/                    # Drizzle migration files
├── public/                        # Static assets (served at /)
├── src/
│   ├── assets/                    # Images and media
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components (button, dialog, tabs, toast, etc.)
│   │   ├── App.tsx                # Root React app wrapper
│   │   ├── IDE.tsx                # Main IDE layout — explorer, editor, tabs, delete
│   │   ├── TopNavBar.tsx          # Top navigation with user menu + project switcher
│   │   ├── ExplorerPane.tsx       # File/project explorer sidebar
│   │   ├── EditorPanel.tsx        # Monaco editor panel
│   │   ├── ConsolePanel.tsx       # Python stdout/stderr output
│   │   ├── ExecutionPanel.tsx     # Run controls + execution state
│   │   ├── FileTab.tsx            # Editor file tab bar
│   │   ├── WebPreview.tsx         # Live HTML preview iframe
│   │   ├── LoadingScreen.tsx      # Full-screen loading state with timeout handling
│   │   ├── ErrorBoundary.tsx      # React error boundary
│   │   ├── CompleteProfile.tsx    # Profile-completion prompt
│   │   ├── UserProfileModal.tsx   # Profile edit modal
│   │   ├── SaveDialog.tsx         # Save-as dialog
│   │   ├── OpenImportDialog.tsx   # Open / import dialog
│   │   └── QueryProvider.tsx      # TanStack React Query provider
│   ├── hooks/
│   │   ├── use-auth-state.ts         # Auth / session state
│   │   ├── use-clerk-user.ts         # Clerk user data
│   │   ├── use-user-profile.ts       # User profile (get/update)
│   │   ├── use-file-management.ts    # File CRUD orchestration
│   │   ├── use-files.ts              # React Query hooks for file CRUD
│   │   ├── use-projects.ts           # Project list
│   │   ├── use-project-data.ts       # Active project data
│   │   ├── use-packages.ts           # Package list
│   │   ├── use-package-data.ts       # Active package data
│   │   ├── use-pyodide.ts            # Pyodide runtime hook
│   │   ├── use-python-execution.ts   # Python execution orchestration
│   │   ├── use-keyboard-shortcuts.ts # Global keyboard shortcuts
│   │   ├── use-loading-state-cleanup.ts # Loading timeout cleanup
│   │   ├── use-toast.ts              # Toast notification hook
│   │   └── use-mobile.tsx            # Mobile viewport detection
│   ├── layouts/
│   │   └── Layout.astro           # Base HTML layout
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts           # Turso/libSQL connection + Drizzle setup
│   │   │   └── storage.ts         # DatabaseStorage class (CRUD operations)
│   │   └── utils.ts               # Utility helpers (cn, etc.)
│   ├── pages/
│   │   ├── index.astro            # Home page
│   │   ├── 404.astro              # Not found page
│   │   └── api/
│   │       ├── health.ts          # GET /api/health
│   │       ├── files/             # Legacy anonymous file endpoints
│   │       ├── user-files/        # Signed-in user files (CRUD)
│   │       ├── projects/          # Projects (CRUD)
│   │       ├── packages/          # Python packages (CRUD)
│   │       ├── user-profile/      # User profile
│   │       └── starter-files/     # Starter-file templates
│   ├── shared/
│   │   └── schema.ts              # Drizzle schema, Zod types, API endpoint definitions
│   ├── styles/
│   │   └── global.css             # Global Tailwind styles
│   ├── test/                      # Vitest unit tests (mirrors src/ layout)
│   │   ├── __mocks__/
│   │   ├── api/
│   │   ├── components/
│   │   ├── helpers/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── shared/
│   │   ├── lambda-handler.test.ts
│   │   └── setup.ts               # Vitest setup (jsdom, jest-dom matchers)
│   └── types/                     # TypeScript type definitions
├── astro.config.mjs               # Astro configuration (SSR, React, Tailwind, Clerk, Node adapter)
├── drizzle.config.ts              # Drizzle ORM configuration (Turso dialect)
├── playwright.config.ts           # Playwright configuration (3 browsers, anon + auth projects)
├── vitest.config.ts               # Vitest configuration
├── tsconfig.json                  # TypeScript configuration
├── Dockerfile                     # Multi-stage production build (local/Docker Compose)
├── Dockerfile.lambda              # Lambda container image build
├── docker-compose.yml             # Single-service app container
├── lambda-handler.cjs             # Lambda handler — proxies requests to Astro server
├── update_aws_deployment.py       # 12-stage AWS deployment script
└── package.json                   # Dependencies and scripts
```

## Available Scripts

| Command                   | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `npm run dev`             | Start Astro dev server with HMR (HTTPS, port 4321)     |
| `npm run build`           | Build for production (SSR)                             |
| `npm run preview`         | Preview the production build locally                   |
| `npm run preview:ci`      | Preview + HTTPS proxy for CI (Playwright `webServer`)  |
| `npm start`               | Run the built production server                        |
| `npm run db:push`         | Push Drizzle schema to Turso                           |
| `npm run db:generate`     | Generate Drizzle migration files                       |
| `npm run db:migrate`      | Run pending migrations                                 |
| `npm run db:studio`       | Open Drizzle Studio (database GUI)                     |
| `npm run lint`            | Run ESLint                                             |
| `npm test`                | Run Vitest unit tests once                             |
| `npm run test:watch`      | Run Vitest in watch mode                               |
| `npm run test:coverage`   | Run Vitest with V8 coverage                            |
| `npm run test:e2e`        | Run Playwright e2e tests (Chromium, Firefox, WebKit)   |
| `npm run test:e2e:ui`     | Run Playwright in interactive UI mode                  |
| `npm run test:all`        | Run Vitest, then Playwright                            |
| `npm run release`         | Bump version, update CHANGELOG, tag (standard-version) |

## API Endpoints

| Method                          | Endpoint                 | Description                           |
| ------------------------------- | ------------------------ | ------------------------------------- |
| `GET`                           | `/api/health`            | Health check                          |
| `GET`                           | `/api/files`             | List files (legacy / anonymous)       |
| `POST`                          | `/api/files/create`      | Create a file (legacy / anonymous)    |
| `GET`                           | `/api/files/:id`         | Get a single file                     |
| `PUT`                           | `/api/files/:id`         | Update a file                         |
| `DELETE`                        | `/api/files/:id`         | Delete a file                         |
| `GET`                           | `/api/user-files`        | List the signed-in user's files       |
| `POST`                          | `/api/user-files/create` | Create a user file                    |
| `GET \| PUT \| PATCH \| DELETE` | `/api/user-files/:id`    | Read / update / delete a user file    |
| `GET`                           | `/api/projects`          | List the user's projects              |
| `POST`                          | `/api/projects/create`   | Create a project                      |
| `GET \| PUT \| PATCH \| DELETE` | `/api/projects/:id`      | Read / update / delete a project      |
| `GET`                           | `/api/packages`          | List installed packages for a project |
| `POST`                          | `/api/packages/create`   | Install a package                     |
| `GET \| PUT \| PATCH \| DELETE` | `/api/packages/:id`      | Read / update / uninstall a package   |
| `GET \| PUT`                    | `/api/user-profile`      | Read / update the user's profile      |
| `GET`                           | `/api/starter-files`     | List starter-file templates           |

## Further Testing Info

Unit and component tests live in `src/test/` (mirroring `src/`) and run under Vitest with jsdom. Playwright e2e tests live in `e2e/` with separate anonymous and authenticated test projects — authenticated projects depend on `auth.setup.ts`, which signs in a Clerk test user once per browser engine and persists `storageState` to `e2e/.auth/<engine>.json`.

### Required env vars for e2e tests

Create a `.env.test` in the project root (gitignored) with:

```bash
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
E2E_CLERK_USER_USERNAME=your-test-user@example.com
E2E_CLERK_USER_PASSWORD=your-test-user-password
```

In CI these come from GitHub Actions secrets.

## Continuous Integration

`.github/workflows/test.yml` runs two jobs on every push and pull request to `main`:

- **`unit-tests`** — Ubuntu runner, Node 22, runs `npm run test:coverage`.
- **`e2e-tests`** — Runs inside the official `mcr.microsoft.com/playwright:v1.59.1-noble` container (Node 22 + all three browsers pre-installed, no `playwright install` step needed). Generates a self-signed TLS cert, builds the Astro app, starts the preview via `npm run preview:ci` (Astro preview + a custom HTTPS reverse proxy from `e2e/https-proxy.mjs`), and runs the full Playwright suite across Chromium, Firefox, and WebKit. The Playwright HTML report is uploaded as a workflow artifact.

## Credits

This project was inspired by [Replit's](https://replit.com) innovative "vibe coding" approach, which provided the initial foundation and philosophy for this IDE. The core implementation and additional features, optimizations, and customizations have been developed and refined independently to create this unique Python REPL IDE experience.

## License

MIT

## Contact & Links

- **GitHub:** [github.com/faddah/code-canvas-astro](https://github.com/faddah/code-canvas-astro)
- **Live Site:** [pyrepl.dev](https://pyrepl.dev)
- **Email:** [my_biz@me.com](mailto:my_biz@me.com)

---

&copy; 2026 186,000 mi/sec productions, inc. & Faddah Wolf. All rights reserved.
