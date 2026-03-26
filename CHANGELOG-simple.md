# Code Canvas Astro — What's New

A plain-language summary of what changed in each version of the app.

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
