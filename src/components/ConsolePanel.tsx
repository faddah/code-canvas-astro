import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Trash2, Terminal } from "lucide-react";

interface ConsolePanelProps {
  logs: string[];
  onClear: () => void;
  isWaitingForInput?: boolean;
  onSubmitInput?: (text: string) => void;
}

export function ConsolePanel({ logs, onClear, isWaitingForInput, onSubmitInput }: ConsolePanelProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-focus the input field when waiting for input
  useEffect(() => {
    if (isWaitingForInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isWaitingForInput]);

  // Auto-scroll to bottom when new logs appear or input field shows
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isWaitingForInput]);

  const handleSubmit = () => {
    if (onSubmitInput) {
      onSubmitInput(inputValue);
      setInputValue("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span>Console</span>
        </div>
        <button 
          onClick={onClear} 
          className="text-xs hover:text-white transition-colors"
          title="Clear Console"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          aria-label="Console output"
          data-testid="console-output"
          className="flex-1 overflow-auto p-4 font-mono text-sm"
        >
          {logs.length === 0 && !isWaitingForInput ? (
            <div className="text-muted-foreground/40 italic select-none">
              Ready to execute. Output will appear here...
            </div>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
                data-testid="console-line"
                data-log-kind={log.startsWith("[Error]") 
                  ? "error"
                  : "output"}
                className={`mb-1 wrap-break-word  whitespace-pre-wrap 
                  ${log.startsWith("[Error]") 
                    ?  "text-red-400"
                    : "text-foreground"
                }`}
              >
              {log}
            </div>
          ))
        )}
        {isWaitingForInput && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-green-400">{">>>"}</span>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
              className="flex-1 bg-transparent border-none outline-none text-foreground font-mono text-sm caret-green-400"
              placeholder="Type your input and press Enter..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
