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
import { ResizablePanelGroup } from "@/components/ui/resizable";
import { Loader2 } from "lucide-react";
import { ExplorerPane } from "@/components/ExplorerPane";
import { SaveDialog } from "@/components/SaveDialog";
import { OpenImportDialog } from "@/components/OpenImportDialog";
import { useToast } from "@/hooks/use-toast";
import { CompleteProfile } from "@/components/CompleteProfile";
import { UserProfileModal } from "@/components/UserProfileModal";
import { useAuth } from "@clerk/astro/react";
import { useClerkUser } from "@/hooks/use-clerk-user";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useFileManagement } from "@/hooks/use-file-management";
import TopNavBar from "@/components/TopNavBar";
import EditorPanel from "@/components/EditorPanel";
import ExecutionPanel from "@/components/ExecutionPanel";

export default function IDE() {
  // Auth state from @clerk/astro/react (uses nanostores, not React Context)
  const { userId, signOut } = useAuth();
  const isSignedIn = !!userId;
  const clerkUser = useClerkUser();

  // Transform UserResource to ClerkUser type
  const user = clerkUser ?? null;

  // File hooks
  const {
    files,
    activeFile,
    activeFileId,
    activeContent,
    activeProjectId,
    openFileIds,
    unsavedChanges,
    isLoadingFiles,
    isLoadingUser,
    isUserFilesError,
    setActiveFileId,
    openTab,
    closeTab,
    handleEditorChange,
    handleQuickSave,
    handleSaveDialog,
    handleImportFiles,
    handleCreateFile,
    handleDeleteFile,
    refetchUserFiles,
  } = useFileManagement({ isSignedIn, userId });

  // Data hooks
  const { data: profile, isSuccess: isProfileSuccess } =
    useUserProfile(isSignedIn);

  // Project hooks
  const { data: projectsData } = useProjects(userId);
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const moveFileToProject = useMoveFileToProject();

  const {
    isReady,
    isRunning,
    output,
    htmlOutput,
    runCode,
    clearConsole,
    isWaitingForInput,
    submitInput,
  } = usePyodide();
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
    onNoChanges: () =>
      toast({ title: "No changes", description: "File is already saved." }),
  });

  const handleRun = async () => {
    if (!activeContent) return;
    if (!isReady) {
      toast({
        title: "Wait a moment",
        description: "Python environment is still loading...",
      });
      return;
    }

    // Prepare all files for the virtual filesystem
    const fileSystem = (files || []).map((f: any) => ({
      name: f.name,
      content: unsavedChanges[f.id] ?? f.content,
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
          <p className="text-muted-foreground font-mono animate-pulse">
            Initializing Environment...
          </p>
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
      <TopNavBar
        isSignedIn={isSignedIn}
        isReady={isReady}
        isRunning={isRunning}
        activeFileId={activeFileId}
        activeContent={activeContent}
        unsavedChanges={unsavedChanges}
        user={user}
        onRun={handleRun}
        onQuickSave={handleQuickSave}
        onSaveAsClick={() => setIsSaveDialogOpen(true)}
        onImportClick={() => setIsOpenImportDialogOpen(true)}
        onProfileClick={() => setShowProfileModal(true)}
      />

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
          onMoveFile={(fileId, projectId) =>
            moveFileToProject.mutate({ fileId, projectId })
          }
          onRetry={() => refetchUserFiles()}
          packages={packagesData ?? []}
          onAddPackage={(packageName) =>
            addPackage.mutate({ packageName, projectId: activeProjectId })
          }
          onRemovePackage={(id) => removePackage.mutate(id)}
          activeProjectName={
            projects.find((p) => p.id === activeProjectId)?.name ?? null
          }
        />

        {/* Editor & Preview Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          <ResizablePanelGroup orientation="horizontal">
            {/* Editor Panel */}
            <EditorPanel
              files={files ?? []}
              activeFileId={activeFileId}
              activeFile={activeFile}
              openFileIds={openFileIds}
              unsavedChanges={unsavedChanges}
              isSignedIn={isSignedIn}
              onTabClick={(id) => setActiveFileId(id)}
              onTabClose={(e, id) => {
                e.stopPropagation();
                closeTab(e, id);
              }}
              onEditorChange={handleEditorChange}
              onQuickSave={handleQuickSave}
            />

            {/* Execution Panel (Web Preview + Console) */}
            <ExecutionPanel
              htmlOutput={htmlOutput}
              logs={output}
              onClear={clearConsole}
              isWaitingForInput={isWaitingForInput}
              onSubmitInput={submitInput}
            />
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
            signOut({ redirectUrl: "/" });
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
