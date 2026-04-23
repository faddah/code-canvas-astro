import { useState, type JSX } from "react";
import {
  Plus,
  FileCode,
  FolderOpen,
  FolderClosed,
  ChevronRight,
  ChevronDown,
  Trash2,
  X,
  GripVertical,
  FileText,
  Package,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Project } from "@shared/schema";

interface FileItem {
  id: number;
  name: string;
  projectId?: number | null;
  [key: string]: any;
}

interface ExplorerPaneProps {
  files: FileItem[];
  projects: Project[];
  activeFileId: number | null;
  unsavedChanges: Record<number, string>;
  isSignedIn: boolean;
  isLoading: boolean;
  isError: boolean;
  packages: { id: number; packageName: string; versionSpec?: string | null }[];
  activeProjectName: string | null;
  onOpenFile: (id: number) => void;
  onDeleteFile: (id: number) => void;
  onCreateFile: (name: string, projectId?: number | null) => void;
  onCreateProject: (name: string) => void;
  onDeleteProject: (id: number) => void;
  onMoveFile: (fileId: number, projectId: number | null) => void;
  onRetry: () => void;
  onAddPackage: (packageName: string) => void;
  onRemovePackage: (id: number) => void;
}

function getFileIcon(name: string): JSX.Element {
  if (name.endsWith(".py")) return <FileCode aria-hidden="true" className="w-4 h-4 opacity-70" />;
  if (name.endsWith(".txt")) return <FileText aria-hidden="true" className="w-4 h-4 opacity-70" />;
  return <FileCode aria-hidden="true" className="w-4 h-4  opacity-70" />;
}

// Mini component for delete confirmation
function Trash2Btn({ onConfirm, disabled, label }: { onConfirm: () => void; disabled: boolean; label: string }) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (disabled) return null;

  if (showConfirm) {
    return (
      <div className="flex items-center gap-1 animate-in slide-in-from-right-2">
        <button
          aria-label={`Confirm deleting ${label}`}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            setShowConfirm(false);
            onConfirm();
          }}
          className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded hover:bg-red-500/40"
        >
          Confirm
        </button>
        <button
          aria-label={`Cancel deleting ${label}`}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            setShowConfirm(false);
          }}
          className="p-0.5 hover:bg-white/10 rounded"
        >
          <X aria-hidden="true" className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      aria-label={`Delete ${label}`}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        setShowConfirm(true);
      }}
      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity"
    >
      <Trash2 aria-hidden="true" className="w-3 h-3  text-muted-foreground hover:text-red-400" />
    </button>
  );;
}

export function ExplorerPane({
  files,
  projects,
  activeFileId,
  unsavedChanges,
  isSignedIn,
  isLoading,
  isError,
  packages,
  activeProjectName,
  onOpenFile,
  onDeleteFile,
  onCreateFile,
  onCreateProject,
  onDeleteProject,
  onMoveFile,
  onRetry,
  onAddPackage,
  onRemovePackage,
}: ExplorerPaneProps) {
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileProjectId, setNewFileProjectId] = useState<number | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [draggedFileId, setDraggedFileId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ type: "project" | "root"; id?: number } | null>(null);
  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);
  const [newPackageName, setNewPackageName] = useState("");
  const handleAddPackage = () => {
    if (!newPackageName.trim()) return;
    onAddPackage(newPackageName.trim());
    setIsAddPackageOpen(false);
    setNewPackageName("");
  };

  const toggleProject = (projectId: number) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    let fileName = newFileName.trim();
    if (!fileName.endsWith(".py") && !fileName.endsWith(".txt")) {
      fileName = `${fileName}.py`;
    }
    onCreateFile(fileName, newFileProjectId);
    setIsNewFileDialogOpen(false);
    setNewFileName("");
    setNewFileProjectId(null);
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    onCreateProject(newProjectName.trim());
    setIsNewProjectDialogOpen(false);
    setNewProjectName("");
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, fileId: number) => {
    setDraggedFileId(fileId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(fileId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnProject = (e: React.DragEvent, projectId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedFileId !== null) {
      onMoveFile(draggedFileId, projectId);
      // Auto-expand the target project
      setExpandedProjects((prev) => new Set([...prev, projectId]));
    }
    setDraggedFileId(null);
    setDropTarget(null);
  };

  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedFileId !== null) {
      onMoveFile(draggedFileId, null);
    }
    setDraggedFileId(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedFileId(null);
    setDropTarget(null);
  };

  // Organize files: loose files (no project) and project-grouped files
  const looseFiles = files.filter((f) => !f.projectId);
  const projectFileMap = new Map<number, FileItem[]>();
  for (const file of files) {
    if (file.projectId) {
      const existing = projectFileMap.get(file.projectId) || [];
      existing.push(file);
      projectFileMap.set(file.projectId, existing);
    }
  }

  const renderFileItem = (file: FileItem, indented: boolean = false) => (
    <div
      key={file.id}
      role="listitem"
      tabIndex={0}
      aria-current={activeFileId === file.id ? "true" : undefined}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") {
      e.preventDefault(); onOpenFile(file.id); } }}
      draggable={isSignedIn}
      onDragStart={(e) => handleDragStart(e, file.id)}
      onDragEnd={handleDragEnd}
      onClick={() => onOpenFile(file.id)}
      className={`group flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors mb-0.5 ${
        indented ? "ml-4" : ""
      } ${
        activeFileId === file.id
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
      } ${draggedFileId === file.id ? "opacity-40" : ""}`}
    >
      { isSignedIn && (<GripVertical aria-hidden="true" className="w-3 h-3" />) }
      { getFileIcon(file.name) }
      <span className="truncate flex-1">{file.name}</span>
      {unsavedChanges[file.id] && (
        <>
          <div aria-hidden="true" className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="sr-only">unsaved changes</span>
        </>
      )}
      <Trash2Btn
        onConfirm={() => onDeleteFile(file.id)}
        disabled={files.length <= 1}
        label={file.name}
      />
    </div>
);

  return (
    <aside
      role="complementary"
      aria-label="Explorer"
      className="w-64 bg-secondary/30 border-r border-border flex-col shrink-0 hidden md:flex"
    >
      {/* Header */}
        <div className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
          <span role="heading" aria-level={2}>Explorer</span>
          <div className="flex items-center gap-1">
            {isSignedIn && (
              <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    aria-label="New Project"
                    className="hover:text-primary hover:bg-primary/10 p-1 rounded transition-colors"
                    title="New Project"
                  >
                    <FolderOpen aria-hidden="true" className="w-4 h-4" />
                  </button>
                </DialogTrigger>
              <DialogContent aria-describedby={undefined} className="bg-white text-black min-h-55 sm:rounded-xl">
                <DialogHeader>
                  <DialogTitle className="text-black font-bold text-xl">Create New Project</DialogTitle>
                </DialogHeader>
                <div className="py-5">
                  <Input
                    placeholder="My Project"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                    autoFocus
                    className="bg-white text-black font-bold text-base border-2 border-gray-400 h-12 placeholder:text-gray-400 focus-visible:ring-blue-500"
                  />
                </div>
                <DialogFooter className="gap-2 sm:gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsNewProjectDialogOpen(false);
                      setNewProjectName("");
                    }}
                    className="border-gray-400 text-black hover:bg-gray-100 font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim()}
                    className="font-semibold"
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Add new file"
                className="hover:text-primary hover:bg-primary/10 p-1 rounded transition-colors"
              >
                <Plus aria-hidden="true" className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white text-black">
              <DropdownMenuItem
                onClick={() => {
                  setNewFileProjectId(null);
                  setIsNewFileDialogOpen(true);
                }}
              >
                New File
              </DropdownMenuItem>
              {projects.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => {
                    setNewFileProjectId(p.id);
                    setIsNewFileDialogOpen(true);
                  }}
                >
                  New File in "{p.name}"
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* New File Dialog */}
      <Dialog open={isNewFileDialogOpen} onOpenChange={setIsNewFileDialogOpen}>
        <DialogContent aria-describedby={undefined} className="bg-white text-black min-h-55 sm:rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-black font-bold text-xl">
              Create New File{newFileProjectId ? ` in Project` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="py-5">
            <Input
              placeholder="script.py"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFile()}
              autoFocus
              className="bg-white text-black font-bold text-base border-2 border-gray-400 h-12 placeholder:text-gray-400 focus-visible:ring-blue-500"
            />
            <p className="text-gray-500 text-xs mt-2">Allowed: .py, .txt files only</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsNewFileDialogOpen(false);
                setNewFileName("");
              }}
              className="border-gray-400 text-black hover:bg-gray-100 font-semibold"
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFile} disabled={!newFileName.trim()} className="font-semibold">
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File List */}
      <div
        className={`flex-1 overflow-y-auto px-2 ${
          dropTarget?.type === "root" ? "bg-blue-500/10 ring-1 ring-blue-500/30 ring-inset" : ""
        }`}
        onDragOver={(e) => {
          handleDragOver(e);
          setDropTarget({ type: "root" });
        }}
        onDragLeave={() => setDropTarget(null)}
        onDrop={handleDropOnRoot}
      >
        {isSignedIn && isLoading && (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center gap-2 py-6 text-xs text-muted-foreground"
            >
              <div aria-hidden="true" className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
            </div>
          )}
          {isSignedIn && isError && (
            <div
              role="alert"
              className="flex flex-col items-center gap-2 py-6 text-xs text-muted-foreground"
            >
              <p className="text-red-400">Could not load files</p>
              <button
                onClick={onRetry}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        {isSignedIn && !isLoading && !isError && (!files || files.length === 0) && projects.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-xs text-muted-foreground">
            <p>No files yet</p>
            <p className="text-[10px]">Click + above to create one</p>
          </div>
        )}

        {/* Projects */}
        {projects.map((project) => {
          const projectFiles = projectFileMap.get(project.id) || [];
          const isExpanded = expandedProjects.has(project.id);
          const isDropTargetProject = dropTarget?.type === "project" && dropTarget.id === project.id;

          return (
            <div key={project.id} role="listitem" className="mb-1">
              <div
                role="button"
                aria-expanded={isExpanded}
                aria-label={project.name}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleProject(project.id); } }}
                className={`group flex items-center gap-1 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
                  isDropTargetProject
                    ? "bg-blue-500/20 ring-1 ring-blue-500/40"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
                onClick={() => toggleProject(project.id)}
                onDragOver={(e) => {
                  handleDragOver(e);
                  setDropTarget({ type: "project", id: project.id });
                }}
                onDragLeave={(e) => {
                  // Only clear if leaving the project element itself
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDropTarget(null);
                  }
                }}
                onDrop={(e) => handleDropOnProject(e, project.id)}
              >
                {isExpanded ? (
                  <ChevronDown aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <ChevronRight aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  )}
                  {isExpanded ? (
                    <FolderOpen aria-hidden="true" className="w-4 h-4 text-yellow-500 shrink-0" />
                  ) : (
                    <FolderClosed aria-hidden="true" className="w-4 h-4 text-yellow-500 shrink-0" />
                  )}
                  <span className="truncate flex-1 font-medium">{project.name}</span>
                  <span aria-label={`${projectFiles.length} files`} className="text-[10px] text-muted-foreground/60">{projectFiles.length}</span>
                  <Trash2Btn onConfirm={() => onDeleteProject(project.id)} disabled={false} label={`project ${project.name}`} />
                </div>

              {/* Project files (when expanded) */}
              {isExpanded && (
                <div
                  className="ml-2 border-l border-border/40 pl-1"
                  onDragOver={(e) => {
                    handleDragOver(e);
                    setDropTarget({ type: "project", id: project.id });
                  }}
                  onDrop={(e) => handleDropOnProject(e, project.id)}
                >
                  {projectFiles.length === 0 ? (
                    <div className="ml-4 py-1 text-[10px] text-muted-foreground/50 italic">
                      No files — drag files here
                    </div>
                  ) : (
                    projectFiles.map((file) => renderFileItem(file, true))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Loose files (not in any project) */}
        {looseFiles.map((file) => renderFileItem(file, false))}
      </div>

      {/* Packages */}
        {isSignedIn && (
          <div className="border-t border-border px-2 py-2">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="
                text-xs
                font-semibold
                text-muted-foreground
                uppercase
                tracking-wider
                flex
                items-center
                gap-1.5"
              >
                <Package aria-hidden="true" className="w-3.5 h-3.5" />
                Packages
                  {activeProjectName && (
                    <span
                    className="
                      normal-case
                      tracking-normal
                      font-normal
                      text-[10px]
                      text-muted-foreground/60
                      ml-0.5"
                    >
                      — {activeProjectName}
                    </span>
                  )}
              </span>
              <button
                aria-label="Add Package"
                onClick={() => setIsAddPackageOpen(true)}
                className="hover:text-primary hover:bg-primary/10 p-1 rounded transition-colors"
                title="Add Package"
              >
                <Plus aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>

            {packages.length === 0 ? (
              <p className="text-[10px] text-muted-foreground/50 italic px-1 py-1">
                No packages — click + to add
              </p>
            ) : (
              <div className="space-y-0.5">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="group flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-white/5"
                  >
                    <Package aria-hidden="true" className="w-3.5 h-3.5 opacity-50" />
                    <span className="truncate flex-1">{pkg.packageName}</span>
                    {pkg.versionSpec && (
                      <span className="text-[10px] text-muted-foreground/60">{pkg.versionSpec}</span>
                    )}
                    <button
                      aria-label={`Remove package ${pkg.packageName}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePackage(pkg.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity"
                    >
                      <Trash2 aria-hidden="true" className="w-3 h-3 text-muted-foreground hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Package Dialog */}
            <Dialog open={isAddPackageOpen} onOpenChange={setIsAddPackageOpen}>
              <DialogContent aria-describedby={undefined} className="bg-white text-black min-h-55 sm:rounded-xl">
                <DialogHeader>
                  <DialogTitle className="text-black font-bold text-xl">Add Package</DialogTitle>
                </DialogHeader>
                <div className="py-5">
                  <Input
                    placeholder="numpy"
                    value={newPackageName}
                    onChange={(e) => setNewPackageName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddPackage()}
                    autoFocus
                    className="bg-white text-black font-bold text-base border-2 border-gray-400 h-12 placeholder:text-gray-400 focus-visible:ring-blue-500"
                  />
                  <p className="text-gray-500 text-xs mt-2">
                    Enter a PyPI package name (e.g. numpy, pandas, matplotlib)
                  </p>
                </div>
                <DialogFooter className="gap-2 sm:gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddPackageOpen(false);
                      setNewPackageName("");
                    }}
                    className="border-gray-400 text-black hover:bg-gray-100 font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddPackage}
                    disabled={!newPackageName.trim()}
                    className="font-semibold"
                  >
                    Add
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border text-[10px] text-muted-foreground/60 italic leading-relaxed">
        <p>&copy;{new Date().getFullYear()} 186,000 miles / second productions</p>
        <a
          href="mailto:my_biz@me.com?subject=Code%20Canvas%20Feedback"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = "mailto:my_biz@me.com?subject=Code%20Canvas%20Feedback";
          }}
          className="text-[#000080] hover:text-[#1E90FF] active:text-[#1E90FF] transition-colors underline"
        >
          Send Feedback
        </a>
      </div>
    </aside>
  );
}
