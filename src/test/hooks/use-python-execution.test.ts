import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePythonExecution } from "@/hooks/use-python-execution";

const mockRunCode = vi.fn();
const mockClearConsole = vi.fn();
const mockSubmitInput = vi.fn();

let mockIsReady = true;

vi.mock("@/hooks/use-pyodide", () => ({
    usePyodide: () => ({
        isReady: mockIsReady,
        isRunning: false,
        output: [],
        htmlOutput: null,
        runCode: mockRunCode,
        clearConsole: mockClearConsole,
        isWaitingForInput: false,
        submitInput: mockSubmitInput,
    }),
}));

describe("usePythonExecution", () => {
    const mockToast = vi.fn();
    const defaultOptions = {
        files: [
            { id: 1, name: "main.py", content: "print('hello')" },
            { id: 2, name: "utils.py", content: "# utils" },
        ],
        packages: [{ id: 1, packageName: "numpy" }],
        unsavedChanges: {} as Record<number, string>,
        toast: mockToast,
    };

    beforeEach(() => {
        mockIsReady = true;
        mockRunCode.mockReset();
        mockToast.mockReset();
    });

    it("exposes pyodide state properties", () => {
        const { result } = renderHook(() => usePythonExecution(defaultOptions));
        expect(result.current.isReady).toBe(true);
        expect(result.current.isRunning).toBe(false);
        expect(result.current.output).toEqual([]);
        expect(result.current.htmlOutput).toBeNull();
    });

    it("handleRun does nothing when activeContent is null", async () => {
        const { result } = renderHook(() => usePythonExecution(defaultOptions));
        await act(async () => {
            await result.current.handleRun(null);
        });
        expect(mockRunCode).not.toHaveBeenCalled();
        expect(mockToast).not.toHaveBeenCalled();
    });

    it("handleRun shows toast when pyodide is not ready", async () => {
        mockIsReady = false;
        const { result } = renderHook(() => usePythonExecution(defaultOptions));
        await act(async () => {
            await result.current.handleRun("print('hello')");
        });
        expect(mockToast).toHaveBeenCalledWith({
            title: "Wait a moment",
            description: "Python environment is still loading...",
        });
        expect(mockRunCode).not.toHaveBeenCalled();
    });

    it("handleRun calls runCode with file system and package names", async () => {
        const { result } = renderHook(() => usePythonExecution(defaultOptions));
        await act(async () => {
            await result.current.handleRun("print('hello')");
        });
        expect(mockRunCode).toHaveBeenCalledWith(
            "print('hello')",
            [
                { name: "main.py", content: "print('hello')" },
                { name: "utils.py", content: "# utils" },
            ],
            ["numpy"],
        );
    });

    it("handleRun uses unsavedChanges content over file content", async () => {
        const options = {
            ...defaultOptions,
            unsavedChanges: { 1: "print('modified')" },
        };
        const { result } = renderHook(() => usePythonExecution(options));
        await act(async () => {
            await result.current.handleRun("print('modified')");
        });
        expect(mockRunCode).toHaveBeenCalledWith(
        "print('modified')",
            [
                { name: "main.py", content: "print('modified')" },
                { name: "utils.py", content: "# utils" },
            ],
            ["numpy"],
        );
    });

    it("exposes clearConsole and submitInput", () => {
        const { result } = renderHook(() => usePythonExecution(defaultOptions));
        expect(result.current.clearConsole).toBe(mockClearConsole);
        expect(result.current.submitInput).toBe(mockSubmitInput);
    });
});
