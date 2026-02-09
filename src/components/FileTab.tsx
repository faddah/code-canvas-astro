import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileTabProps {
  id: number;
  name: string;
  isActive: boolean;
  isUnsaved?: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
}

export function FileTab({ id, name, isActive, isUnsaved, onClick, onClose }: FileTabProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex items-center h-full px-4 min-w-[120px] max-w-[200px] border-r border-border cursor-pointer select-none transition-colors text-sm font-medium",
        isActive 
          ? "bg-background text-primary border-t-2 border-t-primary" 
          : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border-t-2 border-t-transparent"
      )}
    >
      <span className="truncate mr-4 flex items-center gap-2">
        <span className="text-xs opacity-70">🐍</span>
        {name}
      </span>
      
      {isUnsaved && (
        <div className="w-2 h-2 rounded-full bg-white/50 group-hover:hidden absolute right-3" />
      )}
      
      <button
        onClick={onClose}
        className={cn(
          "absolute right-2 opacity-0 group-hover:opacity-100 hover:bg-white/10 p-0.5 rounded transition-all",
          isActive && "opacity-100"
        )}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
