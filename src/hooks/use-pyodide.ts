import { useState, useEffect, useRef } from "react";

declare global {
  interface Window {
    loadPyodide: any;
    pyodide: any;
  }
}

export function usePyodide() {
  const [isReady, setIsReady] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [htmlOutput, setHtmlOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const pyodideRef = useRef<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!window.loadPyodide) {
        // Wait for script to load
        setTimeout(load, 100);
        return;
      }

      if (!pyodideRef.current) {
        try {
          console.log("Initializing Pyodide...");
          const pyodide = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/",
          });
          
          // Redirect stdout/stderr
          pyodide.setStdout({ batched: (msg: string) => appendOutput(msg) });
          pyodide.setStderr({ batched: (msg: string) => appendOutput(msg, true) });
          
          // Define a custom render function for HTML preview
          // Users can call render("<h1>Hello</h1>") in Python
          await pyodide.runPythonAsync(`
            import js
            def render(html_content):
                js.set_preview_content(html_content)
          `);
          
          // Expose the hook's setter to global scope for Pyodide to call
          (window as any).set_preview_content = (content: string) => {
            setHtmlOutput(content);
          };

          pyodideRef.current = pyodide;
          setIsReady(true);
          appendOutput("Pyodide v0.25.0 initialized ready.");
        } catch (err) {
          console.error("Pyodide init failed:", err);
          appendOutput("Failed to initialize Python environment.", true);
        }
      }
    };

    // Load Pyodide Script
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js";
    script.async = true;
    script.onload = load;
    document.body.appendChild(script);

    return () => {
      // Cleanup global if needed, though Pyodide instance persists
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const appendOutput = (msg: string, isError = false) => {
    setOutput((prev) => [...prev, isError ? `[Error] ${msg}` : msg]);
  };

  const clearConsole = () => {
    setOutput([]);
    setHtmlOutput(null);
  };

  const runCode = async (code: string, files: { name: string; content: string }[]) => {
    if (!pyodideRef.current) return;

    setIsRunning(true);
    clearConsole();

    try {
      // 1. Sync Virtual Filesystem
      for (const file of files) {
        pyodideRef.current.FS.writeFile(file.name, file.content);
      }

      // 2. Run the code
      await pyodideRef.current.runPythonAsync(code);
    } catch (err: any) {
      appendOutput(err.toString(), true);
    } finally {
      setIsRunning(false);
    }
  };

  return { isReady, isRunning, output, htmlOutput, runCode, clearConsole };
}
