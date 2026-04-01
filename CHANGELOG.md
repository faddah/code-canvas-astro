# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.2.0](https://github.com/faddah/code-canvas-astro/compare/v2.1.1...v2.2.0) (2026-04-01)

### [2.1.1](https://github.com/faddah/code-canvas-astro/compare/v2.1.0...v2.1.1) (2026-03-30)


### Bug Fixes

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


### Features

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
