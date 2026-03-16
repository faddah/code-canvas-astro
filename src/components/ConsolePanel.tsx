import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Trash2, Terminal } from "lucide-react";

interface ConsolePanelProps {
  logs: string[];
  onClear: () => void;
  isWaitingForInput?: boolean;
  inputPrompt?: string;
  onSubmitInput?: (text: string) => void;
}

export function ConsolePanel({ logs, onClear, isWaitingForInput, inputPrompt, onSubmitInput }: ConsolePanelProps) {
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
      
      <ScrollArea className="flex-1 overflow-auto p-4 font-mono text-sm">
        {logs.length === 0 ? (
          <div className="text-muted-foreground/40 italic select-none">
            Ready to execute. Output will appear here...
          </div>
        ) : (
          logs.map((log, i) => (
            <div 
              key={i} 
              className={`mb-1 wrap-break-word whitespace-pre-wrap ${
                log.startsWith("[Error]") ? "text-red-400" : "text-foreground"
              }`}
            >
              {log}
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
