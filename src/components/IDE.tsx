import { useState, useEffect } from "react";
import {
  useProjects,
  useCreateProject,
  useDeleteProject,
  useMoveFileToProject,
} from "@/hooks/use-projects";
import {
  usePackages,
  useAddPackage,
  useRemovePackage,
} from "@/hooks/use-packages";
import { useUserProfile } from "@/hooks/use-user-profile";
import { usePyodide } from "@/hooks/use-pyodide";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Loader2, Package } from "lucide-react";
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
import { useClerkUser } from "@/hooks/use-clerk-user";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useFileManagement } from "@/hooks/use-file-management";

export default function IDE() {
  // Auth state from @clerk/astro/react (uses nanostores, not React Context)
  const { userId, signOut } = useAuth();
  const isSignedIn = !!userId;
  const user = useClerkUser();
  const {
    files, activeFile, activeFileId, activeContent, activeProjectId,
    openFileIds, unsavedChanges, isLoadingFiles, isLoadingUser,
    isUserFilesError, setActiveFileId, openTab, closeTab,
    handleEditorChange, handleQuickSave, handleSaveDialog,
    handleImportFiles, handleCreateFile, handleDeleteFile, refetchUserFiles,
  } = useFileManagement({ isSignedIn, userId });

  // Data hooks
  const { data: profile, isLoading: isLoadingProfile, isSuccess: isProfileSuccess } = useUserProfile(isSignedIn);

  // Project hooks
  const { data: projectsData } = useProjects(userId);
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const moveFileToProject = useMoveFileToProject();

  const { isReady, isRunning, output, htmlOutput, runCode, clearConsole, isWaitingForInput, submitInput } = usePyodide();
  const { toast } = useToast();

  // Show complete profile modal after first signup
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  useEffect(() => {
  if (isSignedIn && isProfileSuccess && profile === null) {
    setShowCompleteProfile(true);
  } else if (profile) {
    setShowCompleteProfile(false);
  }
}, [isSignedIn, isProfileSuccess, profile]);

  // File management state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isOpenImportDialogOpen, setIsOpenImportDialogOpen] = useState(false);

  const projects = projectsData ?? [];

    // Remove the static loading placeholder once React has mounted
  useEffect(() => {
    const el = document.getElementById("app-loading");
    if (el) el.remove();
  }, []);

  // Package hooks (scoped to active project)
  const { data: packagesData } = usePackages(userId, activeProjectId);
  const addPackage = useAddPackage();
  const removePackage = useRemovePackage();

  // Use Keyboard Shortcuts hook for Cmd+S / Ctrl+S
  useKeyboardShortcuts({
    isSignedIn,
    activeFileId,
    hasUnsavedChanges: unsavedChanges[activeFileId || 0] !== undefined,
    onSave: handleQuickSave,
    onNoChanges: () => toast({ title: "No changes",
    description: "File is already saved." }),
  });

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

    // Collect saved package names for micropip
    const packageNames = (packagesData || []).map((p: any) => p.packageName);

    await runCode(activeContent, fileSystem, packageNames);
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
                  onClick={() => handleQuickSave()}
                  disabled={!activeFileId}
                  className={unsavedChanges[activeFileId || 0] ? "border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10" : ""}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSaveDialogOpen(true)}
                  disabled={!activeFileId}
                >
                  <SaveAll className="w-4 h-4 mr-2" />
                  Save As
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
          packages={packagesData ?? []}
          onAddPackage={(packageName) => addPackage.mutate({ packageName, projectId: activeProjectId })}
          onRemovePackage={(id) => removePackage.mutate(id)}
          activeProjectName={projects.find((p) => p.id === activeProjectId)?.name ?? null}
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
                              handleQuickSave();
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

