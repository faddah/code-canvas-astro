import { vi } from "vitest";

// Stub for Pyodide APIs used by use-pyodide.ts
// Real Pyodide (10MB+ WASM) cannot run in Node/jsdom — E2E tests cover real browser execution

const stdoutCallbacks: Array<(msg: string) => void> = [];
const stderrCallbacks: Array<(msg: string) => void> = [];

export const mockPyodide = {
  runPythonAsync: vi.fn().mockResolvedValue(undefined),
  globals: {
    get: vi.fn(),
    set: vi.fn(),
  },
  loadPackage: vi.fn().mockResolvedValue(undefined),
  setStdout: vi.fn(({ batched }: { batched: (msg: string) => void }) => {
    stdoutCallbacks.push(batched);
  }),
  setStderr: vi.fn(({ batched }: { batched: (msg: string) => void }) => {
    stderrCallbacks.push(batched);
  }),
  FS: {
    writeFile: vi.fn(),
    readFile: vi.fn(),
    readdir: vi.fn().mockReturnValue([]),
    mkdir: vi.fn(),
    unlink: vi.fn(),
  },
};

export const mockLoadPyodide = vi.fn().mockResolvedValue(mockPyodide);

/**
 * Install the mock onto window.loadPyodide.
 * Call this in beforeEach() for tests that exercise usePyodide.
 */
export function installPyodideMock() {
  (window as any).loadPyodide = mockLoadPyodide;
}

/**
 * Clean up the mock from window.
 * Call this in afterEach().
 */
export function uninstallPyodideMock() {
  delete (window as any).loadPyodide;
  delete (window as any).pyodide;
  delete (window as any).set_preview_content;
  delete (window as any).request_console_input;
  stdoutCallbacks.length = 0;
  stderrCallbacks.length = 0;
}

/** Simulate Pyodide writing to stdout */
export function emitStdout(msg: string) {
  stdoutCallbacks.forEach((cb) => cb(msg));
}

/** Simulate Pyodide writing to stderr */
export function emitStderr(msg: string) {
  stderrCallbacks.forEach((cb) => cb(msg));
}
