import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TopNavBar from "@/components/TopNavBar";
import type { Project } from "@shared/schema";

describe("TopNavBar", () => {
    let isSignedIn: boolean;
    let isReady: boolean;
    let isRunning: boolean;
    let activeFileId: number | null;
    let activeContent: string | null;
    let unsavedChanges: Record<number, string>;
    let user: any; // Replace with actual user type if available;
    let onRun: ReturnType<typeof vi.fn<() => void>>;
    let onQuickSave: ReturnType<typeof vi.fn<() => void>>;
    let onSaveAsClick: ReturnType<typeof vi.fn<() => void>>;
    let onImportClick: ReturnType<typeof vi.fn<() => void>>;
    let onProfileClick: ReturnType<typeof vi.fn<() => void>>;

    beforeEach(() => {
        isSignedIn = false;
        isReady = false;
        isRunning = false;
        activeFileId = null;
        activeContent = null;
        unsavedChanges = {};
        user = null;
        onRun = vi.fn();
        onQuickSave = vi.fn();
        onSaveAsClick = vi.fn();
        onImportClick = vi.fn();
        onProfileClick = vi.fn();
    });

    it("Renders Run button; disabled when !isReady or isRunning or !activeFileId", () => {
        const { rerender } = render(
            <TopNavBar
                isSignedIn={isSignedIn}
                isReady={isReady}
                isRunning={isRunning}
                activeFileId={activeFileId}
                activeContent={activeContent}
                unsavedChanges={unsavedChanges}
                user={user}
                onRun={onRun}
                onQuickSave={onQuickSave}
                onSaveAsClick={onSaveAsClick}
                onImportClick={onImportClick}
                onProfileClick={onProfileClick}
            />
        );
        const runButton = screen.getByRole("button", { name: /run/i });
        expect(runButton).toBeInTheDocument();
        expect(runButton).toBeDisabled();

        rerender(
            <TopNavBar
                isSignedIn={isSignedIn}
                isReady={true}
                isRunning={isRunning}
                activeFileId={activeFileId}
                activeContent={activeContent}
                unsavedChanges={unsavedChanges}
                user={user}
                onRun={onRun}
                onQuickSave={onQuickSave}
                onSaveAsClick={onSaveAsClick}
                onImportClick={onImportClick}
                onProfileClick={onProfileClick}
            />
        );
        expect(runButton).toBeDisabled();

        rerender(
            <TopNavBar
                isSignedIn={isSignedIn}
                isReady={true}
                isRunning={isRunning}
                activeFileId={1}
                activeContent={activeContent}
                unsavedChanges={unsavedChanges}
                user={user}
                onRun={onRun}
                onQuickSave={onQuickSave}
                onSaveAsClick={onSaveAsClick}
                onImportClick={onImportClick}
                onProfileClick={onProfileClick}
            />
        );
        expect(runButton).toBeDisabled();

        rerender(
            <TopNavBar
                isSignedIn={isSignedIn}
                isReady={true}
                isRunning={false}
                activeFileId={1}                
                activeContent={activeContent}
                unsavedChanges={unsavedChanges}
                user={user}
                onRun={onRun}
                onQuickSave={onQuickSave}
                onSaveAsClick={onSaveAsClick}
                onImportClick={onImportClick}
                onProfileClick={onProfileClick}
            />
        );
        expect(runButton).toBeEnabled();
    });
});