# E2E Coverage Gaps — Remaining Work

**Project:** code-canvas-astro (Python REPL IDE)
**Date:** 2026-04-11
**Context:** After completing authenticated e2e specs (profile-completion, project-crud, package-management, file-drag-drop) and confirming 256 Playwright + 552 Vitest tests all pass.

---

## High Priority (real user flows not yet tested)

### ~~1. File deletion confirmation flow~~ — DONE (2026-04-12)

- **File:** `e2e/file-delete.auth.spec.ts` — 5 tests

### ~~2. "Taking too long?" reload button~~ — DONE (2026-04-12)

- **File:** `e2e/loading-reload.spec.ts` — 2 tests

### ~~3. Error/retry state in Explorer~~ — DONE (2026-04-12)

- **File:** `e2e/explorer-error-state.auth.spec.ts` — 2 tests

### ~~4. Escape key closes dialogs~~ — DONE (2026-04-12)

- **File:** `e2e/escape-closes-dialogs.auth.spec.ts` — 6 tests (New Project, New File, Add Package, Save As, Open/Import, Complete Profile)

### ~~5. Console output from code execution~~ — DONE (2026-04-12)

- **File:** `e2e/console-output.spec.ts` — 5 tests (mock Pyodide: init, Run output, multiple prints, error with [Error] prefix, clear console)

### ~~6. UserProfileModal edit/delete flows~~ — DONE (2026-04-12)

- **File:** `e2e/user-profile-modal.auth.spec.ts` — 8 tests (view mode: open/data/cancel, edit mode: switch/cancel/save PUT, delete flow: confirm dialog/cancel/DELETE API)

---

## Medium Priority (secondary but valuable)

### ~~7. New File happy path (authenticated)~~ — DONE (2026-04-12)

- **File:** `e2e/new-file-flow.auth.spec.ts` — 3 tests (create .py with POST API, auto-append .py, Enter key submit)

### 8. SaveDialog actual save flow (authenticated)

- Open Save As, fill the form, submit, verify the PUT/POST API call
- **File:** new `e2e/save-flow.auth.spec.ts`

### ~~9. Keyboard shortcut Cmd+S / Ctrl+S~~ — DONE (2026-04-12)

- **File:** `e2e/keyboard-save.auth.spec.ts` — 2 tests (Ctrl+S with unsaved changes fires PUT, Ctrl+S without changes shows "No changes" toast)

### ~~10. File with .txt extension~~ — DONE (2026-04-12)

- **File:** added to `e2e/new-file-flow.auth.spec.ts`
— 1 test (create .txt file, verify name not auto-appended to .py)

---

## Low Priority (edge cases)

### ~~11. Panel resizing via drag handles~~ — DONE (2026-04-12)

- **File:** `e2e/panel-resize.spec.ts`
— 2 tests (horizontal handle resizes editor/execution, vertical handle resizes preview/console)

### ~~12. Mobile viewport (Explorer hidden on small screens)~~ — DONE (2026-04-12)

- **File:** `e2e/responsive.spec.ts` — 2 tests (Explorer hidden at 375px, visible at 1280px)

### ~~13. Long filename truncation~~ — DONE (2026-04-12)

- **File:** added to `e2e/new-file-flow.auth.spec.ts`
— 1 test (long filename has text-overflow: ellipsis and overflow: hidden)

### 14. Duplicate filename handling in New File dialog

- What happens when creating a file with a name that already exists

- **File:** add to New File dialog tests

---

## Current Test Counts (as of 2026-04-12)

| Suite | Tests | Status |
| ----- | ----- | ------ |
| Playwright e2e | 311 | All passing |
| Vitest unit | 552 | All passing |
| **Total** | **863** | **All passing** |

---

### *Generated 2026-04-11*
