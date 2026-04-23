import { useState, useEffect } from "react";
import { useProjectData } from "@/hooks/use-project-data";
import { usePackageData } from "@/hooks/use-package-data";
import { useUserProfile } from "@/hooks/use-user-profile";
import { usePythonExecution } from "@/hooks/use-python-execution";
import { ResizablePanelGroup } from "@/components/ui/resizable";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useLoadingStateCleanup } from "@/hooks/use-loading-state-cleanup";
import { ExplorerPane } from "@/components/ExplorerPane";
import { SaveDialog } from "@/components/SaveDialog";
import { OpenImportDialog } from "@/components/OpenImportDialog";
import { useToast } from "@/hooks/use-toast";
import { CompleteProfile } from "@/components/CompleteProfile";
import { UserProfileModal } from "@/components/UserProfileModal";
import { useAuthState } from "@/hooks/use-auth-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useFileManagement } from "@/hooks/use-file-management";
import TopNavBar from "@/components/TopNavBar";
import EditorPanel from "@/components/EditorPanel";
import ExecutionPanel from "@/components/ExecutionPanel";

export default function IDE() {
  // Auth state
  const { isSignedIn, userId, user, signOut } = useAuthState();

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
  const { projects, createProject, deleteProject, moveFileToProject } = useProjectData(userId);

  // Package hooks (scoped to active project)
  const { packages, addPackage, removePackage } = usePackageData(userId, activeProjectId );

  // Toast hook
  const { toast } = useToast();

  // Python execution (wraps usePyodide + handleRun logic)
  const {
    isReady,
    isRunning,
    output,
    htmlOutput,
    clearConsole,
    isWaitingForInput,
    submitInput,
    handleRun: runPython,
  } = usePythonExecution({ files: files ?? [], packages, unsavedChanges, toast });

  const handleRun = () => runPython(activeContent);

  // Show complete profile modal after first signup
  const [profileDismissed, setProfileDismissed] = useState(false);
  const showCompleteProfile = isSignedIn && isProfileSuccess && profile === null && !profileDismissed;


  // File management state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isOpenImportDialogOpen, setIsOpenImportDialogOpen] = useState(false);

  // Loading state cleanup + "taking too long" timer
  const { loadingTooLong } = useLoadingStateCleanup(isLoadingFiles);

  // Use Keyboard Shortcuts hook for Cmd+S / Ctrl+S
  useKeyboardShortcuts({
    isSignedIn,
    activeFileId,
    hasUnsavedChanges: unsavedChanges[activeFileId || 0] !== undefined,
    onSave: handleQuickSave,
    onNoChanges: () =>
      toast({ title: "No changes", description: "File is already saved." }),
  });

  if (isLoadingFiles) {
    return <LoadingScreen showRetry={loadingTooLong} />;
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
      <div role="main" className="flex-1 flex overflow-hidden">
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
          packages={packages}
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
          onComplete={() => setProfileDismissed(true)}
          onCancel={() => setProfileDismissed(true)}
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
