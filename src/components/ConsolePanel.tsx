import { ScrollArea } from "./ui/scroll-area";
import { Trash2, Terminal } from "lucide-react";

interface ConsolePanelProps {
  logs: string[];
  onClear: () => void;
}

export function ConsolePanel({ logs, onClear }: ConsolePanelProps) {
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
      
      <ScrollArea className="flex-1 p-4 font-mono text-sm">
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
