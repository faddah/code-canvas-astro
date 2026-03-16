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
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [inputPrompt, setInputPrompt] = useState("");
  const inputResolverRef = useRef<((value: string) => void) | null>(null);


  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (cancelled) return;

      if (!window.loadPyodide) {
        setTimeout(load, 100);
        return;
      }

      if (!pyodideRef.current) {
        try {
          console.log("Initializing Pyodide...");
          const pyodide = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/",
            enableRunUntilComplete: true,
          });

          if (cancelled) return;

          // Redirect stdout/stderr
          pyodide.setStdout({ batched: (msg: string) => appendOutput(msg) });
          pyodide.setStderr({ batched: (msg: string) => appendOutput(msg, true) });

          // Define a custom render function for HTML preview
          // Users can call render("<h1>Hello</h1>") in Python
          // Detect JSPI support by trying to import run_sync in Python
          let hasJSPI = false;
          try {
            await pyodide.runPythonAsync(`
              from pyodide.ffi import run_sync as _test_run_sync
              del _test_run_sync
            `);
            hasJSPI = true;
            console.log("JSPI detection: run_sync import succeeded");
          } catch {
            console.log("JSPI detection: run_sync import failed, using prompt() fallback");
          }

          // Define render function + input override
          if (hasJSPI) {
            console.log("JSPI available — using inline console input");
            await pyodide.runPythonAsync(`
              import js
              def render(html_content):
                  js.set_preview_content(html_content)

              import builtins
              import sys
              from pyodide.ffi import run_sync

              def _jspi_input(prompt=""):
                  result = run_sync(js.window.request_console_input(prompt or ""))
                  sys.stdout.write(result + "\\n")
                  return result
              builtins.input = _jspi_input
            `);
          } else {
            console.log("JSPI unavailable — using prompt() fallback");
            await pyodide.runPythonAsync(`
              import js
              def render(html_content):
                  js.set_preview_content(html_content)

              import builtins
              import sys
              def _custom_input(prompt=""):
                  if prompt:
                      sys.stdout.write(prompt)
                  result = js.window.prompt(prompt or "Python input:")
                  if result is None:
                      result = ""
                  sys.stdout.write(result + "\\n")
                  return result
              builtins.input = _custom_input
            `);
          }


          // Expose the hook's setter to global scope for Pyodide to call
          (window as any).set_preview_content = (content: string) => {
            setHtmlOutput(content);
          };

          (window as any).request_console_input = requestInput;

          pyodideRef.current = pyodide;
          setIsReady(true);
          appendOutput("Pyodide v0.27.7 initialized ready.");
        } catch (err) {
          console.error("Pyodide init failed:", err);
          if (!cancelled) {
            appendOutput("Failed to initialize Python environment.", true);
          }
        }
      }
    };

    // Check if the script is already loaded (e.g., from a previous mount)
    if (window.loadPyodide) {
      load();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js";
      script.async = true;
      script.onload = load;
      script.onerror = () => {
        console.error("Failed to load Pyodide script");
        if (!cancelled) {
          appendOutput("Failed to load Python environment script.", true);
        }
      };
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
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
