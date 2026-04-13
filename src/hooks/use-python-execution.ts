import { useCallback } from "react";
import { usePyodide } from "@/hooks/use-pyodide";

interface UsePythonExecutionOptions {
    files: any[];
    packages: any[];
    unsavedChanges: Record<number, string>;
    toast: (opts: { title: string; description: string }) => void;
}

export function usePythonExecution({
    files,
    packages,
    unsavedChanges,
    toast,
    }: UsePythonExecutionOptions) {
    const pyodide = usePyodide();

    const handleRun = useCallback(
        async (activeContent: string | null) => {
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
        },
        [files, packages, unsavedChanges, pyodide, toast],
    );

    return {
        isReady: pyodide.isReady,
        isRunning: pyodide.isRunning,
        output: pyodide.output,
        htmlOutput: pyodide.htmlOutput,
        clearConsole: pyodide.clearConsole,
        isWaitingForInput: pyodide.isWaitingForInput,
        submitInput: pyodide.submitInput,
        handleRun,
    };
}
