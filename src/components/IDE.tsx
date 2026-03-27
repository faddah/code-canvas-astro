import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import {
  useStarterFiles,
  useUserFiles,
  useCreateUserFile,
  useUpdateUserFile,
  useDeleteUserFile,
} from "@/hooks/use-files";
import {
  useProjects,
  useCreateProject,
  useDeleteProject,
  useMoveFileToProject,
} from "@/hooks/use-projects";
import { useQueryClient } from "@tanstack/react-query";
import { useUserProfile } from "@/hooks/use-user-profile";
import { usePyodide } from "@/hooks/use-pyodide";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Loader2, Play, Save, FolderOpen, Code2, LogOut, LogIn, UserPlus, User } from "lucide-react";
import Editor from "@monaco-editor/react";
import { FileTab } from "@/components/FileTab";
import { ConsolePanel } from "@/components/ConsolePanel";
import { WebPreview } from "@/components/WebPreview";
import { ExplorerPane } from "@/components/ExplorerPane";
import { SaveDialog } from "@/components/SaveDialog";
import { OpenImportDialog } from "@/components/OpenImportDialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CompleteProfile } from "@/components/CompleteProfile";
import { UserProfileModal } from "@/components/UserProfileModal";
import { version } from "../../package.json";
import { useAuth, SignInButton, SignUpButton, SignOutButton } from "@clerk/astro/react";
import { $userStore } from "@clerk/astro/client";
import { api } from "@shared/schema";

// Subscribe to the $userStore nanostore from @clerk/astro/client
function useClerkUser() {
  const get = $userStore.get.bind($userStore);
  return useSyncExternalStore($userStore.listen, get, () => null);
}

export default function IDE() {
  // Auth state from @clerk/astro/react (uses nanostores, not React Context)
  const { userId, signOut } = useAuth();
  const isSignedIn = !!userId;
  const user = useClerkUser();

  // Data hooks
  const { data: starterFiles, isLoading: isLoadingStarter } = useStarterFiles();
  const {
    data: userFilesData,
    isLoading: isLoadingUser,
    isError: isUserFilesError,
    error: userFilesError,
    refetch: refetchUserFiles,
  } = useUserFiles(userId);
  const { data: profile, isLoading: isLoadingProfile, isSuccess: isProfileSuccess } = useUserProfile(isSignedIn);

  const createFile = useCreateUserFile();
  const updateFile = useUpdateUserFile();
  const deleteFile = useDeleteUserFile();

  // Project hooks
  const { data: projectsData } = useProjects(userId);
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const moveFileToProject = useMoveFileToProject();

  const { isReady, isRunning, output, htmlOutput, runCode, clearConsole, isWaitingForInput, submitInput } = usePyodide();
  const { toast } = useToast();

  const queryClient = useQueryClient();

  // Ephemeral local files for non-logged-in users (lost on refresh)
  const [localFiles, setLocalFiles] = useState<any[]>([]);
  const [localIdCounter, setLocalIdCounter] = useState(-1);

  // Track previous auth state to distinguish real login/logout from
  // the spurious false→true transition that happens on every page refresh
  // (Clerk starts with isSignedIn=false while the client SDK loads).
  const prevSignedIn = useRef<boolean | null>(null);

  // Seed local files from starter files when not signed in
  useEffect(() => {
    if (!isSignedIn && starterFiles && starterFiles.length > 0 && localFiles.length === 0) {
      setLocalFiles(starterFiles.map((f: any) => ({ ...f })));
    }
  }, [isSignedIn, starterFiles]);

  // Choose which files to display
  const files = isSignedIn ? userFilesData : localFiles;
  const isLoadingFiles = isSignedIn ? isLoadingUser : isLoadingStarter;

  // Show complete profile modal after first signup
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  useEffect(() => {
  if (isSignedIn && isProfileSuccess && profile === null) {
    setShowCompleteProfile(true);
  } else if (profile) {
    setShowCompleteProfile(false);
  }
}, [isSignedIn, isProfileSuccess, profile]);


  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [openFileIds, setOpenFileIds] = useState<number[]>([]);
  const [unsavedChanges, setUnsavedChanges] = useState<Record<number, string>>({});
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isOpenImportDialogOpen, setIsOpenImportDialogOpen] = useState(false);

  const projects = projectsData ?? [];

    // Remove the static loading placeholder once React has mounted
  useEffect(() => {
    const el = document.getElementById("app-loading");
    if (el) el.remove();
  }, []);

  // Handle auth state changes (login/logout) without disrupting page refreshes.
  useEffect(() => {
    const wasSignedIn = prevSignedIn.current;
    prevSignedIn.current = isSignedIn;

    // First render (wasSignedIn === null): skip reset — component just mounted,
    // let the data hooks populate files naturally.
    if (wasSignedIn === null) return;

    // Real logout (was signed in, now signed out)
    if (wasSignedIn && !isSignedIn) {
      setActiveFileId(null);
      setOpenFileIds([]);
      setUnsavedChanges({});
      setLocalFiles(starterFiles ? starterFiles.map((f: any) => ({ ...f })) : []);
      setLocalIdCounter(-1);
    }

    // Real login (was signed out, now signed in)
    if (!wasSignedIn && isSignedIn) {
      setActiveFileId(null);
      setOpenFileIds([]);
      setUnsavedChanges({});
      // Invalidate & refetch user files to ensure fresh data after login.
      // Use the userId-scoped key so we target the right cache entry.
      queryClient.invalidateQueries({ queryKey: [api.userFiles.list.path] });
    }
  }, [isSignedIn, queryClient]);

  // Initialize active file when files load
  useEffect(() => {
    if (files && files.length > 0 && activeFileId === null) {
      setActiveFileId(files[0].id);
      setOpenFileIds([files[0].id]);
    }
  }, [files, activeFileId]);

  const activeFile = files?.find((f: any) => f.id === activeFileId);
  const activeContent = activeFileId ? (unsavedChanges[activeFileId] ?? activeFile?.content ?? "") : "";

  // Handlers
  const handleEditorChange = (value: string | undefined) => {
    if (activeFileId && value !== undefined) {
      setUnsavedChanges(prev => ({ ...prev, [activeFileId]: value }));
    }
  };

  // Quick save (writes content without dialog)
  const handleQuickSave = useCallback(async () => {
    if (!isSignedIn) return;
    if (!activeFileId || unsavedChanges[activeFileId] === undefined) return;

    const content = unsavedChanges[activeFileId];

    try {
      await updateFile.mutateAsync({
        id: activeFileId,
        content: content,
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
  }, [isSignedIn, activeFileId, unsavedChanges, updateFile, toast]);

  // Save dialog handler (supports rename + project assignment)
  const handleSaveDialog = async (fileName: string, content: string, projectId: number | null) => {
    if (!isSignedIn || !activeFileId) return;

    try {
      await updateFile.mutateAsync({
        id: activeFileId,
        name: fileName,
        content: content,
        projectId: projectId,
      });

      setUnsavedChanges(prev => {
        const next = { ...prev };
        delete next[activeFileId];
        return next;
      });

      toast({ title: "Saved", description: `${fileName} saved successfully.` });
    } catch (e) {
      // Error handled in hook
    }
  };

  // Open/Import handler
  const handleImportFiles = async (importedFiles: { name: string; content: string }[], projectId: number | null) => {
    if (!isSignedIn) return;

    for (const file of importedFiles) {
      try {
        const newFile = await createFile.mutateAsync({
          name: file.name,
          content: file.content,
          ...(projectId ? { projectId } : {}),
        });
        setOpenFileIds(prev => [...prev, newFile.id]);
        setActiveFileId(newFile.id);
      } catch (e) {
        // Error handled in hook
      }
    }
  };

  // Cmd+S / Ctrl+S keyboard shortcut (opens Save dialog or quick-saves)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (isSignedIn && activeFileId) {
          if (unsavedChanges[activeFileId] !== undefined) {
            setIsSaveDialogOpen(true);
          } else {
            toast({ title: "No changes", description: "File is already saved." });
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSignedIn, activeFileId, unsavedChanges, toast]);

  const handleRun = async () => {
    if (!activeContent) return;
    if (!isReady) {
      toast({ title: "Wait a moment", description: "Python environment is still loading..." });
      return;
    }

    // Prepare all files for the virtual filesystem
    const fileSystem = (files || []).map((f: any) => ({
      name: f.name,
      content: unsavedChanges[f.id] ?? f.content
    }));

    await runCode(activeContent, fileSystem);
  };

  const handleCreateFile = async (fileName: string, projectId?: number | null) => {
    if (!fileName) return;
    const normalizedName = (fileName.endsWith(".py") || fileName.endsWith(".txt")) ? fileName : `${fileName}.py`;
    const defaultContent = normalizedName.endsWith(".py")
      ? "# New Python File\nprint('Hello World')\n"
      : "";

    if (isSignedIn) {
      try {
        const newFile = await createFile.mutateAsync({
          name: normalizedName,
          content: defaultContent,
          ...(projectId ? { projectId } : {}),
        });
        setOpenFileIds(prev => [...prev, newFile.id]);
        setActiveFileId(newFile.id);
      } catch (e) {
        // Error handled in hook
      }
    } else {
      const newId = localIdCounter;
      setLocalIdCounter(prev => prev - 1);
      const newFile = {
        id: newId,
        name: normalizedName,
        content: defaultContent,
        createdAt: new Date(),
      };
      setLocalFiles(prev => [...prev, newFile]);
      setOpenFileIds(prev => [...prev, newId]);
      setActiveFileId(newId);
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

  const handleDeleteFile = (id: number) => {
    const cleanupUI = () => {
      setOpenFileIds(prev => prev.filter(fid => fid !== id));
      if (activeFileId === id) {
        const remaining = openFileIds.filter(fid => fid !== id);
        setActiveFileId(remaining.length > 0 ? remaining[remaining.length - 1] : null);
      }
      setUnsavedChanges(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    };

    if (isSignedIn) {
      deleteFile.mutate(id, { onSuccess: cleanupUI });
    } else {
      // Remove from local ephemeral files
      setLocalFiles(prev => prev.filter(f => f.id !== id));
      cleanupUI();
    }
  };

  // Track how long we've been loading — show a retry hint after 10 seconds
  const [loadingTooLong, setLoadingTooLong] = useState(false);
  useEffect(() => {
    if (!isLoadingFiles) {
      setLoadingTooLong(false);
      return;
    }
    const timer = setTimeout(() => setLoadingTooLong(true), 10_000);
    return () => clearTimeout(timer);
  }, [isLoadingFiles]);

  if (isLoadingFiles) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-primary">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="text-muted-foreground font-mono animate-pulse">Initializing Environment...</p>
          {loadingTooLong && (
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Taking too long? Click to reload
            </button>
          )}
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

            {isSignedIn && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (activeFileId && unsavedChanges[activeFileId] !== undefined) {
                      setIsSaveDialogOpen(true);
                    } else {
                      handleQuickSave();
                    }
                  }}
                  disabled={!activeFileId}
                  className={unsavedChanges[activeFileId || 0] ? "border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10" : ""}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpenImportDialogOpen(true)}
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Open / Import
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Auth banner / buttons */}
          {!isSignedIn ? (
            <>
              <span className="text-xs px-3 py-1.5 rounded-full hidden lg:block border" style={{ color: '#33ff33', backgroundColor: '#0a0a0a', borderColor: '#33ff33', textShadow: '0 0 6px #33ff33' }}>
                Files cannot be saved unless you create &amp; use a Python REPL IDE User account
              </span>
              <SignUpButton mode="modal">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Create An Account</span>
                </Button>
              </SignUpButton>
              <SignInButton mode="modal">
                <Button size="sm" className="gap-1.5">
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Log In</span>
                </Button>
              </SignInButton>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowProfileModal(true)}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground hidden md:flex"
              >
                <User className="w-3.5 h-3.5" />
                {user?.primaryEmailAddress?.emailAddress}
              </Button>
              <SignOutButton>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <LogOut className="w-3.5 h-3.5" />
                  Log Out
                </Button>
              </SignOutButton>
            </>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full border border-white/5">
              <span className={`w-2 h-2 rounded-full ${isReady ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
              {isReady ? `Environment Ready          Version ${version}` : "Loading Python..."}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar - File Explorer */}
        <ExplorerPane
          files={files ?? []}
          projects={projects}
          activeFileId={activeFileId}
          unsavedChanges={unsavedChanges}
          isSignedIn={isSignedIn}
          isLoading={isLoadingUser}
          isError={isUserFilesError}
          onOpenFile={openTab}
          onDeleteFile={handleDeleteFile}
          onCreateFile={handleCreateFile}
          onCreateProject={(name) => createProject.mutate({ name })}
          onDeleteProject={(id) => deleteProject.mutate(id)}
          onMoveFile={(fileId, projectId) => moveFileToProject.mutate({ fileId, projectId })}
          onRetry={() => refetchUserFiles()}
        />

        {/* Editor & Preview Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          <ResizablePanelGroup orientation="horizontal">

            {/* Editor Panel */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full flex flex-col">
                {/* Tabs Bar */}
                <div className="h-9 flex bg-muted/30 border-b border-border overflow-x-auto no-scrollbar">
                  {openFileIds.map(id => {
                    const file = files?.find((f: any) => f.id === id);
                    if (!file) return null;
                    return (
                      <div key={id}>
                        <FileTab
                          name={file.name}
                          isActive={activeFileId === id}
                          isUnsaved={!!unsavedChanges[id]}
                          onClick={() => setActiveFileId(id)}
                          onClose={(e) => closeTab(e, id)}
                        />
                      </div>
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
                    <div style={{ height: '100%' }}>
                      <Editor
                        height="100%"
                        defaultLanguage="python"
                        theme="vs-dark"
                        path={`file://${activeFileId}`}
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
                          padding: { top: 16 },
                          readOnly: false,
                        }}
                        onMount={(editor) => {
                          if (isSignedIn) {
                            editor.addCommand(2048 | 49, () => {
                              setIsSaveDialogOpen(true);
                            });
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30">
                      <Code2 className="w-16 h-16 mb-4 opacity-20" />
                      <p>Select a file to edit</p>
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle className="w-1.5 bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />

            {/* Right Panel Group (Preview + Console) */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <ResizablePanelGroup orientation="vertical">

                {/* Web Preview */}
                <ResizablePanel defaultSize={60} minSize={20}>
                  <WebPreview htmlContent={htmlOutput} />
                </ResizablePanel>

                <ResizableHandle className="h-0.75! w-full! bg-[#CCCCCC] hover:bg-primary/50 transition-colors cursor-row-resize" />


                {/* Console */}
                <ResizablePanel defaultSize={40} minSize={20}>
                  <ConsolePanel
                    logs={output}
                    onClear={clearConsole}
                    isWaitingForInput={isWaitingForInput}
                    onSubmitInput={submitInput}
                  />

                </ResizablePanel>

              </ResizablePanelGroup>
            </ResizablePanel>

          </ResizablePanelGroup>
        </div>
      </div>

      {/* Complete Profile Modal */}
      {showCompleteProfile && (
        <CompleteProfile
          onComplete={() => setShowCompleteProfile(false)}
          onCancel={() => setShowCompleteProfile(false)}
        />

      )}

      {/* User Profile Modal */}
      {isSignedIn && (
        <UserProfileModal
          open={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onDeleteProfile={() => {
            setShowProfileModal(false);
            signOut({ redirectUrl: '/' });
          }}
          user={user}
          profile={profile}
        />
      )}

      {/* Save Dialog */}
      {isSignedIn && activeFile && (
        <SaveDialog
          open={isSaveDialogOpen}
          onOpenChange={setIsSaveDialogOpen}
          fileName={activeFile.name}
          fileContent={unsavedChanges[activeFileId!] ?? activeFile.content}
          projects={projects}
          currentProjectId={activeFile.projectId ?? null}
          onSave={handleSaveDialog}
        />
      )}

      {/* Open / Import Dialog */}
      {isSignedIn && (
        <OpenImportDialog
          open={isOpenImportDialogOpen}
          onOpenChange={setIsOpenImportDialogOpen}
          projects={projects}
          onImport={handleImportFiles}
        />
      )}
    </div>
  );
}

