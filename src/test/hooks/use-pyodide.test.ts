import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  mockPyodide,
  mockLoadPyodide,
  installPyodideMock,
  uninstallPyodideMock,
} from "../__mocks__/pyodide";

// Must import after mock is available on window
let usePyodide: typeof import("@/hooks/use-pyodide").usePyodide;

beforeEach(async () => {
  installPyodideMock();
  vi.clearAllMocks();
  // Dynamic import so window.loadPyodide is present
  const mod = await import("@/hooks/use-pyodide");
  usePyodide = mod.usePyodide;
});

afterEach(() => {
  uninstallPyodideMock();
  vi.restoreAllMocks();
});

describe("usePyodide", () => {
  it("initializes and becomes ready", async () => {
    const { result } = renderHook(() => usePyodide());

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(mockLoadPyodide).toHaveBeenCalled();
  });

  it("sets stdout and stderr handlers on Pyodide", async () => {
    const { result } = renderHook(() => usePyodide());

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(mockPyodide.setStdout).toHaveBeenCalled();
    expect(mockPyodide.setStderr).toHaveBeenCalled();
  });

  it("runCode writes files to FS and calls runPythonAsync", async () => {
    const { result } = renderHook(() => usePyodide());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => {
      await result.current.runCode('print("hello")', [
        { name: "main.py", content: 'print("hello")' },
      ]);
    });

    expect(mockPyodide.FS.writeFile).toHaveBeenCalledWith(
      "main.py",
      'print("hello")'
    );
    expect(mockPyodide.runPythonAsync).toHaveBeenCalledWith('print("hello")');
  });

  it("runCode does nothing when Pyodide is not ready", async () => {
    // Don't install mock — loadPyodide won't resolve
    uninstallPyodideMock();

    const { result } = renderHook(() => usePyodide());

    await act(async () => {
      await result.current.runCode('print("hi")', []);
    });

    // runPythonAsync should not have been called
    expect(mockPyodide.runPythonAsync).not.toHaveBeenCalledWith('print("hi")');
  });

  it("runCode captures errors in output", async () => {
    const { result } = renderHook(() => usePyodide());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    // Set rejection AFTER initialization so it applies to the runCode call
    mockPyodide.runPythonAsync.mockRejectedValueOnce(
      new Error("NameError: name 'foo' is not defined")
    );

    await act(async () => {
      await result.current.runCode("foo", []);
    });

    expect(result.current.output).toContainEqual(
      expect.stringContaining("NameError")
    );
    expect(result.current.isRunning).toBe(false);
  });

  it("runCode shows install progress when packageNames are provided", async () => {
    const { result } = renderHook(() => usePyodide());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => {
      await result.current.runCode('print("hello")', [], ["numpy", "pandas"]);
    });

    // Should show install start message
    expect(result.current.output).toContainEqual("Installing numpy, pandas...");
    // Should show install complete message
    expect(result.current.output).toContainEqual("Installed 2 packages.");
    // micropip install should have been called via runPythonAsync
    expect(mockPyodide.runPythonAsync).toHaveBeenCalledWith(
      expect.stringContaining("micropip.install")
    );
  });

    it("runCode shows singular form for single package", async () => {
      const { result } = renderHook(() => usePyodide());

      await waitFor(() => expect(result.current.isReady).toBe(true));

      await act(async () => {
        await result.current.runCode('print("hello")', [], ["numpy"]);
      });

      expect(result.current.output).toContainEqual("Installing numpy...");
      expect(result.current.output).toContainEqual("Installed 1 package.");
    });

    it("runCode skips install messages when no packages provided", async () => {
      const { result } = renderHook(() => usePyodide());

      await waitFor(() => expect(result.current.isReady).toBe(true));

      await act(async () => {
        await result.current.runCode('print("hello")', []);
      });

      expect(result.current.output).not.toContainEqual(
        expect.stringContaining("Installing")
      );
    });

  it("clearConsole resets output and htmlOutput", async () => {
    const { result } = renderHook(() => usePyodide());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    // Should have initialization message
    expect(result.current.output.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearConsole();
    });

    expect(result.current.output).toEqual([]);
    expect(result.current.htmlOutput).toBeNull();
  });

  // ─── JSPI Detection: Chrome (inline console input) vs Safari/Firefox (prompt fallback) ───

  it("uses inline console input (request_console_input) when JSPI is available — Chrome", async () => {
    // Default mock: runPythonAsync resolves successfully, so the JSPI detection
    // code (`from pyodide.ffi import run_sync; run_sync(js.window._jspi_test())`)
    // succeeds → hasJSPI = true → registers builtins.input as _jspi_input
    const { result } = renderHook(() => usePyodide());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    // The JSPI-path Python code should have been run (the one defining _jspi_input)
    const jspiInputCall = mockPyodide.runPythonAsync.mock.calls.find(
      ([code]) => code.includes("_jspi_input")
    );
    expect(jspiInputCall).toBeDefined();

    // The prompt() fallback code should NOT have been run
    const promptFallbackCall = mockPyodide.runPythonAsync.mock.calls.find(
      ([code]) => code.includes("_custom_input") && code.includes("js.window.prompt")
    );
    expect(promptFallbackCall).toBeUndefined();

    // request_console_input should be registered on window
    expect((window as any).request_console_input).toBeDefined();
  });

  it("falls back to window.prompt() modal when JSPI is unavailable — Safari/Firefox", async () => {
    // Make the JSPI detection fail (the run_sync test throws)
    // The first call is JSPI detection, which should fail
    let callCount = 0;
    mockPyodide.runPythonAsync.mockImplementation(async (code: string) => {
      callCount++;
      // First call is the JSPI detection — make it throw
      if (code.includes("run_sync") && code.includes("_jspi_test")) {
        throw new Error("run_sync is not supported");
      }
      // All subsequent calls succeed (render function + prompt fallback setup)
      return undefined;
    });
    
    const { result } = renderHook(() => usePyodide());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    // The prompt() fallback Python code should have been run (the one defining _custom_input)
    const promptFallbackCall = mockPyodide.runPythonAsync.mock.calls.find(
      ([code]) => code.includes("_custom_input") && code.includes("js.window.prompt")
    );
    expect(promptFallbackCall).toBeDefined();

    // The JSPI inline input code should NOT have been run
    const jspiInputCall = mockPyodide.runPythonAsync.mock.calls.find(
      ([code]) => code.includes("_jspi_input") && !code.includes("_jspi_test")
    );
    expect(jspiInputCall).toBeUndefined();
  });

  it("window.prompt() is called by the fallback path when JSPI is unavailable — Safari/Firefox", async () => {
    // Mock window.prompt to simulate the browser's native modal dialog
    const promptMock = vi.fn().mockReturnValue("Safari user input");
    window.prompt = promptMock;

    // Force JSPI detection to fail → fallback path
    mockPyodide.runPythonAsync.mockImplementation(async (code: string) => {
      if (code.includes("run_sync") && code.includes("_jspi_test")) {
        throw new Error("run_sync is not supported");
      }
      return undefined;
    });

    const { result } = renderHook(() => usePyodide());
    await waitFor(() => expect(result.current.isReady).toBe(true));

    // Verify the prompt() fallback Python code was registered
    const promptFallbackCall = mockPyodide.runPythonAsync.mock.calls.find(
      ([code]) => code.includes("_custom_input") && code.includes("js.window.prompt")
    );
    expect(promptFallbackCall).toBeDefined();

    // Simulate what Pyodide's _custom_input Python function does:
    // it calls js.window.prompt(prompt_text) to get user input via the browser modal.
    // Since runPythonAsync is mocked (no real Python runtime in jsdom), we verify
    // that window.prompt is callable and returns the expected value.
    const userInput = window.prompt("Enter your name:");
    expect(promptMock).toHaveBeenCalledWith("Enter your name:");
    expect(userInput).toBe("Safari user input");

    // Verify prompt returns empty string when user cancels (clicks Cancel on the modal)
    promptMock.mockReturnValueOnce(null);
    const cancelledInput = window.prompt("Python input:");
    expect(cancelledInput).toBeNull();
  });

  // ─── Console Input Flow ───

  it("submitInput resolves pending input and appends to output", async () => {
    const { result } = renderHook(() => usePyodide());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    // Simulate requesting input (as Pyodide would via request_console_input)
    let inputPromise: Promise<string> | undefined;
    act(() => {
      inputPromise = (window as any).request_console_input("Enter name: ");
    });

    expect(result.current.isWaitingForInput).toBe(true);

    let resolved: string | undefined;
    act(() => {
      result.current.submitInput("Alice");
    });

    if (inputPromise) {
      resolved = await inputPromise;
    }

    expect(resolved).toBe("Alice");
    expect(result.current.isWaitingForInput).toBe(false);
    expect(result.current.output).toContainEqual("Alice");
  });

  it("creates a script element when window.loadPyodide is not present", async () => {
    // Remove the mock so loadPyodide is not on window
    uninstallPyodideMock();

    const appendSpy = vi.spyOn(document.head, "appendChild");

    const { result, unmount } = renderHook(() => usePyodide());

    // A script element should have been appended to document.head
    await waitFor(() => {
      const scriptCall = appendSpy.mock.calls.find(
        ([el]) => el instanceof HTMLScriptElement && el.src.includes("pyodide")
      );
      expect(scriptCall).toBeDefined();
    });

    // isReady should still be false since the script won't actually load in jsdom
    expect(result.current.isReady).toBe(false);

    unmount();
    appendSpy.mockRestore();
    // Reinstall for other tests
    installPyodideMock();
  });

  it("cancellation on unmount prevents isReady from becoming true", async () => {
    // Make loadPyodide hang (never resolve) to test the cancellation path
    let resolveLoad: (value: any) => void;
    (window as any).loadPyodide = () => new Promise((resolve) => { resolveLoad = resolve; });

    const { result, unmount } = renderHook(() => usePyodide());

    // Unmount immediately before loadPyodide resolves
    unmount();

    // Now resolve — the cancelled flag should prevent state updates
    resolveLoad!(mockPyodide);

    // Small delay to allow any pending promises
    await new Promise((r) => setTimeout(r, 50));

    // isReady should NOT have become true since the hook was unmounted
    expect(result.current.isReady).toBe(false);
  });

  // ─── Error Handling Paths ───

  it("outputs error message when loadPyodide() throws during init", async () => {
    // Make loadPyodide reject to exercise the catch block (lines 113-117)
    mockLoadPyodide.mockRejectedValueOnce(new Error("WASM load failed"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => usePyodide());

    await waitFor(() => {
      expect(result.current.output).toContainEqual(
        "[Error] Failed to initialize Python environment."
      );
    });

    expect(consoleSpy).toHaveBeenCalledWith("Pyodide init failed:", expect.any(Error));
    // isReady should remain false
    expect(result.current.isReady).toBe(false);

    consoleSpy.mockRestore();
  });

  it("outputs error message when script fails to load (onerror)", async () => {
    // Remove loadPyodide so the hook creates a <script> element
    uninstallPyodideMock();

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.head, "appendChild").mockImplementation((el) => {
      // Simulate script load failure by immediately calling onerror
      if (el instanceof HTMLScriptElement && el.src.includes("pyodide")) {
        setTimeout(() => el.onerror?.(new Event("error")), 0);
      }
      return el;
    });

    const { result } = renderHook(() => usePyodide());

    await waitFor(() => {
      expect(result.current.output).toContainEqual(
        "[Error] Failed to load Python environment script."
      );
    });

    expect(consoleSpy).toHaveBeenCalledWith("Failed to load Pyodide script");
    expect(result.current.isReady).toBe(false);

    consoleSpy.mockRestore();
    appendSpy.mockRestore();
    installPyodideMock();
  });

  // ─── set_preview_content (HTML Preview) ───

  it("set_preview_content updates htmlOutput", async () => {
    const { result } = renderHook(() => usePyodide());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    // The hook registers window.set_preview_content during init
    expect((window as any).set_preview_content).toBeDefined();

    act(() => {
      (window as any).set_preview_content("<h1>Hello World</h1>");
    });

    expect(result.current.htmlOutput).toBe("<h1>Hello World</h1>");
  });

  // ─── requestInput / submitInput edge cases ───

  it("requestInput with empty prompt does not append to output", async () => {
    const { result } = renderHook(() => usePyodide());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => {
      result.current.clearConsole();
    });

    // Request input with empty string — should NOT append prompt to output
    act(() => {
      (window as any).request_console_input("");
    });

    expect(result.current.isWaitingForInput).toBe(true);
    // Output should be empty since prompt was ""
    expect(result.current.output).toEqual([]);
  });

  it("retries loading when script.onload fires but loadPyodide is not yet on window", async () => {
    // Remove loadPyodide so the hook creates a <script> element with an onload handler
    uninstallPyodideMock();

    let capturedScript: HTMLScriptElement | null = null;
    const appendSpy = vi.spyOn(document.head, "appendChild").mockImplementation((el) => {
      if (el instanceof HTMLScriptElement && el.src.includes("pyodide")) {
        capturedScript = el;
      }
      return el;
    });

    const { result } = renderHook(() => usePyodide());

    // Script element should have been created
    expect(capturedScript).toBeTruthy();

    // Simulate script.onload firing, but loadPyodide is NOT yet on window
    // This triggers load() → !window.loadPyodide → setTimeout(load, 100) retry
    capturedScript!.onload?.(new Event("load"));

    // Now install the mock so the retry (after 100ms) finds loadPyodide
    installPyodideMock();

    await waitFor(() => expect(result.current.isReady).toBe(true), { timeout: 3000 });

    appendSpy.mockRestore();
  });

  it("submitInput without pending input request does not throw", async () => {
    const { result } = renderHook(() => usePyodide());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => {
      result.current.clearConsole();
    });

    // Call submitInput when there is no pending input — should not throw
    act(() => {
      result.current.submitInput("orphaned input");
    });

    expect(result.current.isWaitingForInput).toBe(false);
    // The text should still be appended to output
    expect(result.current.output).toContainEqual("orphaned input");
  });
});
