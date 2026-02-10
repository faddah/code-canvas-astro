import { useState, useEffect } from "react";
import { useFiles, useCreateFile, useUpdateFile, useDeleteFile } from "@/hooks/use-files";
import { usePyodide } from "@/hooks/use-pyodide";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Loader2, Play, Plus, Save, FileCode, Code2 } from "lucide-react";
import Editor from "@monaco-editor/react";
import { FileTab } from "@/components/FileTab";
import { ConsolePanel } from "@/components/ConsolePanel";
import { WebPreview } from "@/components/WebPreview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function IDE() {
  const { data: files, isLoading: isLoadingFiles } = useFiles();
  const createFile = useCreateFile();
  const updateFile = useUpdateFile();
  const deleteFile = useDeleteFile();
  const { isReady, isRunning, output, htmlOutput, runCode, clearConsole } = usePyodide();
  const { toast } = useToast();

  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [openFileIds, setOpenFileIds] = useState<number[]>([]);
  const [unsavedChanges, setUnsavedChanges] = useState<Record<number, string>>({});
  const [newFileName, setNewFileName] = useState("");
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false);

  // Initialize active file when files load
  useEffect(() => {
    if (files && files.length > 0 && activeFileId === null) {
      setActiveFileId(files[0].id);
      setOpenFileIds([files[0].id]);
    }
  }, [files, activeFileId]);

  const activeFile = files?.find(f => f.id === activeFileId);
  const activeContent = activeFileId ? (unsavedChanges[activeFileId] ?? activeFile?.content ?? "") : "";

  // Handlers
  const handleEditorChange = (value: string | undefined) => {
    if (activeFileId && value !== undefined) {
      setUnsavedChanges(prev => ({ ...prev, [activeFileId]: value }));
    }
  };

  const handleSave = async () => {
    if (!activeFileId || unsavedChanges[activeFileId] === undefined) return;
    
    try {
      await updateFile.mutateAsync({
        id: activeFileId,
        content: unsavedChanges[activeFileId],
      });
      
      setUnsavedChanges(prev => {
        const next = { ...prev };
        delete next[activeFileId];
        return next;
      });
      
      toast({ title: "Saved", description: "Changes saved to disk." });
    } catch (e) {
      // Error handled in hook
    }
  };

  const handleRun = async () => {
    if (!activeContent) return;
    if (!isReady) {
      toast({ title: "Wait a moment", description: "Python environment is still loading..." });
      return;
    }

    // Prepare all files for the virtual filesystem
    // Mix saved files with current unsaved states
    const fileSystem = (files || []).map(f => ({
      name: f.name,
      content: unsavedChanges[f.id] ?? f.content
    }));

    await runCode(activeContent, fileSystem);
  };

  const handleCreateFile = async () => {
    if (!newFileName) return;
    const fileName = newFileName.endsWith(".py") ? newFileName : `${newFileName}.py`;
    
    try {
      const newFile = await createFile.mutateAsync({
        name: fileName,
        content: "# New Python File\nprint('Hello World')\n"
      });
      
      setOpenFileIds(prev => [...prev, newFile.id]);
      setActiveFileId(newFile.id);
      setIsNewFileDialogOpen(false);
      setNewFileName("");
    } catch (e) {
      // Error handled in hook
    }
  };

  const closeTab = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setOpenFileIds(prev => prev.filter(fid => fid !== id));
    if (activeFileId === id) {
      const remaining = openFileIds.filter(fid => fid !== id);
      setActiveFileId(remaining.length > 0 ? remaining[remaining.length - 1] : null);
    }
  };

  const openTab = (id: number) => {
    if (!openFileIds.includes(id)) {
      setOpenFileIds(prev => [...prev, id]);
    }
    setActiveFileId(id);
  };

  if (isLoadingFiles) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-primary">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="text-muted-foreground font-mono animate-pulse">Initializing Environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-border bg-card/50 backdrop-blur px-4 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-primary font-bold tracking-tight">
            <div className="bg-primary/20 p-1.5 rounded-md">
              <Code2 className="w-5 h-5 text-primary" />
            </div>
            <span className="font-mono text-lg hidden md:block">Python REPL IDE</span>
          </div>

          <div className="h-6 w-px bg-border mx-2 hidden md:block" />

          {/* Toolbar Actions */}
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              onClick={handleRun}
              disabled={!isReady || isRunning || !activeFileId}
              className="bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-900/20 transition-all active:scale-95"
            >
              {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2 fill-current" />}
              Run
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSave}
              disabled={!activeFileId}
              className={unsavedChanges[activeFileId || 0] ? "border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10" : ""}
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full border border-white/5">
              <span className={`w-2 h-2 rounded-full ${isReady ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
              {isReady ? "Environment Ready" : "Loading Python..."}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar - File Explorer */}
        <div className="w-64 bg-secondary/30 border-r border-border flex-col shrink-0 hidden md:flex">
          <div className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Explorer</span>
            <Dialog open={isNewFileDialogOpen} onOpenChange={setIsNewFileDialogOpen}>
              <DialogTrigger asChild>
                <button className="hover:text-primary hover:bg-primary/10 p-1 rounded transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New File</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Input 
                    placeholder="script.py" 
                    value={newFileName} 
                    onChange={e => setNewFileName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateFile()}
                    autoFocus
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateFile}>Create File</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="flex-1 overflow-y-auto px-2">
            {files?.map(file => (
              <div 
                key={file.id}
                onClick={() => openTab(file.id)}
                className={`group flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors mb-0.5 ${
                  activeFileId === file.id 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <FileCode className="w-4 h-4 opacity-70" />
                <span className="truncate flex-1">{file.name}</span>
                {unsavedChanges[file.id] && (
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                )}
                <Trash2Btn 
                  onConfirm={() => deleteFile.mutate(file.id)} 
                  disabled={files.length <= 1} 
                />
              </div>
            ))}
          </div>
        </div>

        {/* Editor & Preview Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          <ResizablePanelGroup orientation="horizontal">
            
            {/* Editor Panel */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full flex flex-col">
                {/* Tabs Bar */}
                <div className="h-9 flex bg-muted/30 border-b border-border overflow-x-auto no-scrollbar">
                  {openFileIds.map(id => {
                    const file = files?.find(f => f.id === id);
                    if (!file) return null;
                    return (
                      <FileTab
                        key={id}
                        id={id}
                        name={file.name}
                        isActive={activeFileId === id}
                        isUnsaved={!!unsavedChanges[id]}
                        onClick={() => setActiveFileId(id)}
                        onClose={(e) => closeTab(e, id)}
                      />
                    );
                  })}
                  
                  {openFileIds.length === 0 && (
                    <div className="flex items-center px-4 text-xs text-muted-foreground italic">
                      No files open
                    </div>
                  )}
                </div>

                {/* Monaco Editor */}
                <div className="flex-1 relative bg-[#1e1e1e]">
                  {activeFileId ? (
                    <Editor
                      height="100%"
                      defaultLanguage="python"
                      theme="vs-dark"
                      path={`file://${activeFileId}`} // Important for independent editor states
                      value={unsavedChanges[activeFileId] ?? activeFile?.content}
                      onChange={handleEditorChange}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', monospace",
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 4,
                        padding: { top: 16 }
                      }}
                      onMount={(editor) => {
                        // Add save command
                        editor.addCommand(2048 | 49, handleSave); // Ctrl+S / Cmd+S
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30">
                      <Code2 className="w-16 h-16 mb-4 opacity-20" />
                      <p>Select a file to edit</p>
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle className="w-1.5 bg-border hover:bg-primary/50 transition-colors" />

            {/* Right Panel Group (Preview + Console) */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <ResizablePanelGroup orientation="vertical">
                
                {/* Web Preview */}
                <ResizablePanel defaultSize={60} minSize={20}>
                  <WebPreview htmlContent={htmlOutput} />
                </ResizablePanel>

                <ResizableHandle className="h-1.5 bg-border hover:bg-primary/50 transition-colors" />

                {/* Console */}
                <ResizablePanel defaultSize={40} minSize={20}>
                  <ConsolePanel logs={output} onClear={clearConsole} />
                </ResizablePanel>
                
              </ResizablePanelGroup>
            </ResizablePanel>
          
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
}

// Mini component for delete confirmation
function Trash2Btn({ onConfirm, disabled }: { onConfirm: () => void, disabled: boolean }) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (disabled) return null;

  if (showConfirm) {
    return (
      <div className="flex items-center gap-1 animate-in slide-in-from-right-2">
        <button 
          onClick={(e) => { e.stopPropagation(); onConfirm(); }}
          className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded hover:bg-red-500/40"
        >
          Confirm
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }}
          className="p-0.5 hover:bg-white/10 rounded"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity"
    >
      <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-400" />
    </button>
  );
}
import { Trash2, X } from "lucide-react";
