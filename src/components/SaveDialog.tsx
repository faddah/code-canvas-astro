import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import type { Project } from "@shared/schema";

const ALLOWED_EXTENSIONS = [".py", ".txt"];

function isValidFileName(name: string): boolean {
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

interface SaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  fileContent: string;
  projects: Project[];
  currentProjectId: number | null;
  onSave: (fileName: string, content: string, projectId: number | null) => void;
}

export function SaveDialog({
  open,
  onOpenChange,
  fileName,
  fileContent,
  projects,
  currentProjectId,
  onSave,
}: SaveDialogProps) {
  const [name, setName] = useState(fileName);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    currentProjectId ? String(currentProjectId) : "none"
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(fileName);
      setSelectedProjectId(currentProjectId ? String(currentProjectId) : "none");
      setError("");
    }
  }, [open, fileName, currentProjectId]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("File name is required.");
      return;
    }
    if (!isValidFileName(trimmed)) {
      setError("Only .py and .txt files are allowed.");
      return;
    }
    const projId = selectedProjectId === "none" ? null : Number(selectedProjectId);
    onSave(trimmed, fileContent, projId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white text-black sm:rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-black font-bold text-xl flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save File
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">File Name</label>
            <Input
              placeholder="script.py"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
              className="bg-white text-black font-medium text-base border-2 border-gray-400 h-11 placeholder:text-gray-400 focus-visible:ring-blue-500"
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            <p className="text-gray-500 text-xs mt-1">Allowed: .py, .txt files only</p>
          </div>

          {projects.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Project (optional)</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="bg-white text-black border-2 border-gray-400 h-11">
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent className="bg-white text-black">
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-400 text-black hover:bg-gray-100 font-semibold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="font-semibold"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
