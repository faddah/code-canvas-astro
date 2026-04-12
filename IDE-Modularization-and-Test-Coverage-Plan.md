# IDE.tsx Modularization & Test Coverage Plan

**Project:** code-canvas-astro (Python REPL IDE)
**Date:** 2026-04-10

---

## Part 1: IDE.tsx Modularization Opportunities

IDE.tsx is currently 304 lines with major UI sections already extracted (TopNavBar, EditorPanel, ExecutionPanel, ExplorerPane). The following additional extractions would improve clarity, testability, and reusability.

---

### High Priority (significant clarity improvement)

#### 1. `useAuthState` hook — IDE.tsx lines 32-38

Consolidates `useAuth()` + `useClerkUser()` + the `isSignedIn` derivation into one hook. Currently auth state is sourced from two places and transformed inline.

**Current code in IDE.tsx:**

```ts
const { userId, signOut } = useAuth();
const isSignedIn = !!userId;
const clerkUser = useClerkUser();
const user = clerkUser ?? null;
```

**Suggested hook (`src/hooks/use-auth-state.ts`):**

```ts
export function useAuthState() {
  const { userId, signOut } = useAuth();
  const clerkUser = useClerkUser();

  return {
    isSignedIn: !!userId,
    userId,
    user: clerkUser ?? null,
    signOut,
  };
}
```

**Usage in IDE.tsx:**

```ts
const { isSignedIn, userId, user, signOut } = useAuthState();
```

---

#### 2. `useProjectData` hook — IDE.tsx lines 68-72, 101

Aggregates `useProjects`, `useCreateProject`, `useDeleteProject`, `useMoveFileToProject` + the `projectsData ?? []` fallback.

**Current code in IDE.tsx:**

```ts
const { data: projectsData } = useProjects(userId);
const createProject = useCreateProject();
const deleteProject = useDeleteProject();
const moveFileToProject = useMoveFileToProject();
// ...
const projects = projectsData ?? [];
```

**Suggested hook (`src/hooks/use-project-data.ts`):**

```ts
export function useProjectData(userId: string | null | undefined) {
  const { data: projectsData } = useProjects(userId);
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const moveFileToProject = useMoveFileToProject();

  return {
    projects: projectsData ?? [],
    createProject,
    deleteProject,
    moveFileToProject,
  };
}
```

---

#### 3. `usePackageData` hook — IDE.tsx lines 109-112

Same pattern as above for `usePackages`, `useAddPackage`, `useRemovePackage`.

**Current code in IDE.tsx:**

```ts
const { data: packagesData } = usePackages(userId, activeProjectId);
const addPackage = useAddPackage();
const removePackage = useRemovePackage();
```

**Suggested hook (`src/hooks/use-package-data.ts`):**

```ts
export function usePackageData(userId: string | null | undefined, projectId?: number | null) {
  const { data: packagesData } = usePackages(userId, projectId);
  const addPackage = useAddPackage();
  const removePackage = useRemovePackage();

  return {
    packages: packagesData ?? [],
    addPackage,
    removePackage,
  };
}
```

---

#### 4. `usePythonExecution` hook — IDE.tsx lines 74-83, 124-144

Wraps `usePyodide()` and extracts the `handleRun` logic (virtual filesystem prep, package name extraction, "not ready" toast). This is domain logic that doesn't belong in the layout component.

**Current code in IDE.tsx:**

```ts
const {
  isReady, isRunning, output, htmlOutput,
  runCode, clearConsole, isWaitingForInput, submitInput,
} = usePyodide();

const handleRun = async () => {
  if (!activeContent) return;
  if (!isReady) {
    toast({
      title: "Wait a moment",
      description: "Python environment is still loading...",
    });
    return;
  }
  const fileSystem = (files || []).map((f: any) => ({
    name: f.name,
    content: unsavedChanges[f.id] ?? f.content,
  }));
  const packageNames = (packagesData || []).map((p: any) => p.packageName);
  await runCode(activeContent, fileSystem, packageNames);
};
```

**Suggested hook (`src/hooks/use-python-execution.ts`):**

```ts
export function usePythonExecution(
  files: any[],
  packages: any[],
  unsavedChanges: Record<number, string>,
  toast: any
) {
  const pyodide = usePyodide();

  const handleRun = useCallback(async (activeContent: string | null) => {
    if (!activeContent) return;
    if (!pyodide.isReady) {
      toast({
        title: "Wait a moment",
        description: "Python environment is still loading...",
      });
      return;
    }
    const fileSystem = (files || []).map((f: any) => ({
      name: f.name,
      content: unsavedChanges[f.id] ?? f.content,
    }));
    const packageNames = (packages || []).map((p: any) => p.packageName);
    await pyodide.runCode(activeContent, fileSystem, packageNames);
  }, [files, packages, unsavedChanges, pyodide, toast]);

  return { ...pyodide, handleRun };
}
```

---

### Medium Priority

#### 5. `LoadingScreen` component — IDE.tsx lines 157-176

The full-screen loading state with the "Taking too long?" retry button. Self-contained JSX, easy to extract.

**Suggested component (`src/components/LoadingScreen.tsx`):**

```tsx
import { Loader2 } from "lucide-react";

export function LoadingScreen({ showRetry = false }: { showRetry?: boolean }) {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-background text-primary">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin" />
        <p className="text-muted-foreground font-mono animate-pulse">
          Initializing Environment...
        </p>
        {showRetry && (
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Taking too long? Click to reload
          </button>
        )}
      </div>
    </div>
  );
}
```

**Usage in IDE.tsx:**

```tsx
if (isLoadingFiles) {
  return <LoadingScreen showRetry={loadingTooLong} />;
}
```

---

#### 6. `useLoadingStateCleanup` hook — IDE.tsx lines 104-107, 147-155

Combines the DOM cleanup effect (removing `#app-loading`) with the "loading too long" timeout timer.

**Suggested hook (`src/hooks/use-loading-state-cleanup.ts`):**

```ts
export function useLoadingStateCleanup(isLoading: boolean) {
  const [loadingTooLong, setLoadingTooLong] = useState(false);

  useEffect(() => {
    const el = document.getElementById("app-loading");
    if (el) el.remove();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setLoadingTooLong(false);
      return;
    }
    const timer = setTimeout(() => setLoadingTooLong(true), 10_000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  return { loadingTooLong };
}
```

---

### Low Priority (only if the codebase grows)

#### 7. `useCompleteProfileModal` — IDE.tsx lines 86-94

Profile completion modal visibility logic. Only worth extracting if profile completion logic grows more complex.

#### 8. Modal state consolidation — IDE.tsx lines 97-99

Three `useState` booleans for modal visibility. Only worth consolidating if dialog state becomes more complex.

---

### Expected Result After Modularization

| Metric | Before | After |
| ------ | ------ | ----- |
| IDE.tsx lines | ~304 | ~200 |
| Hooks imported | 11 | 6-7 (aggregated) |
| Cognitive load | High (multiple concerns mixed) | Medium (concerns separated) |
| Testability | Lower (logic embedded in component) | Higher (each hook testable) |

---

## Part 2: Test Coverage Audit

### Current Stats

- **29 unit test files** — 430 tests passing
- **6 E2E spec files** — 132 tests passing (chromium, firefox, webkit)

---

### Coverage Summary Table

| Category | Total Files | Unit Tested | Coverage | Status |
| -------- | ----------- | ----------- | -------- | ------ |
| Components | 15 | 14 | 93% | EditorPanel missing |
| Hooks | 9 | 7 | 78% | use-toast, use-clerk-user missing |
| Libraries | 3 | 2 | 67% | lib/utils.ts not tested |
| API Routes | 15 | 0 (unit) | 0% (unit) | CRITICAL GAP |
| Shared | 1 | 1 | 100% | Complete |
| E2E Specs | - | 6 files | Partial | Limited flow coverage |

---

### Critical Gaps

#### 1. API Routes — 0% Unit Test Coverage (15 route files)

All API routes only have E2E coverage checking 401 auth responses. No unit tests for:

- `POST /api/user-files/create` — file creation logic
- `PUT /api/user-files/[id]` — file updates, projectId assignment
- `DELETE /api/user-files/[id]` — deletion logic
- `POST /api/user-profile` — profile creation, race condition handling
- `PUT /api/user-profile` — profile updates
- `DELETE /api/user-profile` — cascade deletes
- `POST /api/projects/create` — project creation
- `PUT /api/projects/[id]` — project updates
- `DELETE /api/projects/[id]` — project deletion
- `POST /api/packages/create` — package installation
- `DELETE /api/packages/[id]` — package removal
- `GET /api/packages?projectId=X` — filtering logic

Missing error path coverage: invalid JSON bodies, database constraint violations, missing resources (404s), server errors (500s).

#### 2. Missing Hook Unit Tests

- **`use-toast.ts`** — Core state management hook (reducer logic, cleanup, timeout management)
- **`use-clerk-user.ts`** — Auth hook (`useSyncExternalStore` subscription, listener cleanup)

#### 3. Missing Component Unit Test

- **`EditorPanel.tsx`** — No unit test (ConsolePanel, WebPreview, FileTab all have tests)

---

### Medium Priority Gaps

#### 4. E2E Flow Gaps

- No tests for profile completion flow
- No tests for project CRUD workflows (create/delete/rename)
- No tests for package management UI
- No tests for file drag-and-drop between projects

#### 5. Thin Test Coverage

- **`use-projects.test.ts`** — Only ~100 lines, minimal error path coverage
- **`ExecutionPanel.tsx`** — No dedicated unit test (thin layout wrapper)
- **`lib/utils.ts`** — No unit test

---

### What's Already Well-Covered

- **`use-files.test.ts`** — 680+ lines, excellent error path coverage (HTTP errors, JSON parsing failures, fallback messages, retry logic with fake timers)
- **IDE.tsx** — 6 dedicated test files covering auth, interactions, loading, profile, and transitions
- **Component tests** — 14 of 15 components have dedicated tests
- **E2E tests** — Handle Pyodide WASM timing, branch coverage unreachable in jsdom, cross-browser testing

---

### Recommended Priority Order

#### Tier 1 — Critical (Do First)

1. Add unit tests for all 15 API routes (~40-50 new tests)
2. Add unit tests for `use-toast.ts` and `use-clerk-user.ts`
3. Add unit test for `EditorPanel.tsx`

#### Tier 2 — High (Do Next)

4. Deepen E2E coverage: profile completion, project CRUD, package management flows
5. Add integration tests for critical flows (create file -> save -> fetch)

#### Tier 3 — Medium (Nice to Have)

6. Test `ExecutionPanel.tsx`
7. Test `lib/utils.ts`
8. Expand `use-projects.test.ts` error path coverage

---

### *Generated 2026-04-10*
