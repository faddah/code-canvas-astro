import { useEffect } from "react";

export interface UseKeyboardShortcutsOptions {
    isSignedIn: boolean;
    activeFileId: number | null;
    hasUnsavedChanges: boolean;
    onSave: () => void;
    onNoChanges: () => void;
}

export function useKeyboardShortcuts({
    isSignedIn,
    activeFileId,
    hasUnsavedChanges,
    onSave,
    onNoChanges,
}: UseKeyboardShortcutsOptions) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                if (isSignedIn && activeFileId) {
                    if (hasUnsavedChanges) {
                        onSave();
                    } else {
                        onNoChanges();
                    }
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isSignedIn, activeFileId, hasUnsavedChanges, onSave, onNoChanges]);
}