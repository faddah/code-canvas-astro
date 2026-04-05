import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStarterFiles, useUserFiles } from "@/hooks/use-files";
import { useCreateUserFile, useUpdateUserFile, useDeleteUserFile } from "@/hooks/use-files";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/schema";

interface UseFileManagementOptions {
    isSignedIn: boolean;
    userId: string | null | undefined;
}
export function useFileManagement({ isSignedIn, userId }: UseFileManagementOptions) {
    const { data: starterFiles, isLoading: isLoadingStarter } = useStarterFiles();
    const {
        data: userFilesData,
        isLoading: isLoadingUser,
        isError: isUserFilesError,
        refetch: refetchUserFiles,
    } = useUserFiles(userId);
    const createFile = useCreateUserFile();
    const updateFile = useUpdateUserFile();
    const deleteFile = useDeleteUserFile();
    const { toast } = useToast();
    const queryClient = useQueryClient();
     // Ephemeral local files for non-logged-in users (lost on refresh)
    const [localFiles, setLocalFiles] = useState<any[]>([]);
    const [localIdCounter, setLocalIdCounter] = useState(-1);
    const [unsavedChanges, setUnsavedChanges] = useState<Record<number, string>>({});
    // Choose which files to display
    const files = isSignedIn ? userFilesData : localFiles;
    const isLoadingFiles = isSignedIn ? isLoadingUser : isLoadingStarter;
    const [activeFileId, setActiveFileId] = useState<number | null>(null);
    const [openFileIds, setOpenFileIds] = useState<number[]>([]);
    
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
    const activeContent = activeFileId ? (unsavedChanges[activeFileId] ?? activeFile?.content
    ?? "") : "";
    const activeProjectId = activeFile?.projectId ?? null;

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
            toast({ title: "Error", description: `Failed to save changes: ${e}`});
        }
    }, [isSignedIn, activeFileId, unsavedChanges, updateFile, toast]);// Save dialog handler (supports rename + project assignment)
    
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
            toast({ title: "Error", description: `Failed to save changes: ${e}`});
        }
    };

    // Handle file creation
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
                toast({ title: "Error", description: `Failed to create file: ${e}`});
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

    // Tab management (quick close)
    const closeTab = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setOpenFileIds(prev => prev.filter(fid => fid !== id));
        if (activeFileId === id) {
        const remaining = openFileIds.filter(fid => fid !== id);
        setActiveFileId(remaining.length > 0 ? remaining[remaining.length - 1] : null);
        }
    };

    // Tab management (open)
    const openTab = (id: number) => {
        if (!openFileIds.includes(id)) {
        setOpenFileIds(prev => [...prev, id]);
        }
        setActiveFileId(id);
    };

    // Handle file deletion
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

    return {
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
    };
}