import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderOpen, FileUp, X } from "lucide-react";
import type { Project } from "@shared/schema";

const ALLOWED_EXTENSIONS = [".py", ".txt"];
const ACCEPT_STRING = ".py,.txt";

function isAllowedFile(file: File): boolean {
  return ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
}

interface ImportedFile {
  name: string;
  content: string;
}

interface OpenImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onImport: (files: ImportedFile[], projectId: number | null) => void;
}

export function OpenImportDialog({
  open,
  onOpenChange,
  projects,
  onImport,
}: OpenImportDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<ImportedFile[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("none");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSelectedFiles([]);
      setSelectedProjectId("none");
      setError("");
    }
  }, [open]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const newFiles: ImportedFile[] = [];
    const rejected: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (isAllowedFile(file)) {
        const content = await file.text();
        newFiles.push({ name: file.name, content });
      } else {
        rejected.push(file.name);
      }
    }

    if (rejected.length > 0) {
      setError(`Skipped non-.py/.txt files: ${rejected.join(", ")}`);
    } else {
      setError("");
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one file to import.");
      return;
    }
    const projId = selectedProjectId === "none" ? null : Number(selectedProjectId);
    onImport(selectedFiles, projId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white text-black sm:rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-black font-bold text-xl flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Open / Import Files
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_STRING}
              multiple
              onChange={handleFileSelect}
              className="hidden"
              data-testid="file-input"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-20 border-2 border-dashed border-gray-400 hover:border-blue-500 hover:bg-blue-50 text-gray-600 flex flex-col items-center gap-1"
            >
              <FileUp className="w-6 h-6" />
              <span className="text-sm">Click to select .py or .txt files</span>
            </Button>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            <p className="text-gray-500 text-xs mt-1">Only .py and .txt files are accepted</p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Selected Files ({selectedFiles.length})</label>
              <div className="max-h-32 overflow-y-auto space-y-1 border border-gray-200 rounded-md p-2">
                {selectedFiles.map((file, i) => (
                  <div
                    key={`${file.name}-${i}`}
                    className="flex items-center justify-between text-sm bg-gray-50 px-2 py-1 rounded"
                  >
                    <span className="truncate flex-1 text-gray-800">{file.name}</span>
                    <button
                      onClick={() => removeFile(i)}
                      className="ml-2 p-0.5 hover:bg-gray-200 rounded"
                    >
                      <X className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Import into Project (optional)</label>
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
            onClick={handleImport}
            disabled={selectedFiles.length === 0}
            className="font-semibold"
          >
            Open / Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
