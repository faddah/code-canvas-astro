import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts, type UseKeyboardShortcutsOptions } from "@/hooks/use-keyboard-shortcuts";

beforeEach(() => {
    vi.restoreAllMocks();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("useKeyboardShortcuts", () => {
    it("calls onSave when CMD+S is pressed while signed in, has active file, and has unsaved changes", async () => {
        const mockOnSave = vi.fn();
        const mockOnNoChanges = vi.fn();

        renderHook(
            () =>
                useKeyboardShortcuts({
                    isSignedIn: true,
                    activeFileId: 1,
                    hasUnsavedChanges: true,
                    onSave: mockOnSave,
                    onNoChanges: mockOnNoChanges,
                }),
        );

        // Simulate CMD+S key press
        const event = new KeyboardEvent("keydown", { key: "s", metaKey: true });
        window.dispatchEvent(event);

        expect(mockOnSave).toHaveBeenCalled();
    });

    it("calls onNoChanges when CMD+S is pressed while signed in, has active file, but no unsaved changes", () => {
        const mockOnSave = vi.fn();
        const mockOnNoChanges = vi.fn();

        renderHook(
            () =>
                useKeyboardShortcuts({
                    isSignedIn: true,
                    activeFileId: 1,
                    hasUnsavedChanges: false,
                    onSave: mockOnSave,
                    onNoChanges: mockOnNoChanges,
                }),
        );

        // Simulate CMD+S key press
        const event = new KeyboardEvent("keydown", { key: "s", metaKey: true });
        window.dispatchEvent(event);

        expect(mockOnNoChanges).toHaveBeenCalled();
    });

    it("does nothing when CMD+S is pressed while not signed in", () => {
        const mockOnSave = vi.fn();
        const mockOnNoChanges = vi.fn();

        renderHook(
            () =>
                useKeyboardShortcuts({
                    isSignedIn: false,
                    activeFileId: 1,
                    hasUnsavedChanges: true,
                    onSave: mockOnSave,
                    onNoChanges: mockOnNoChanges,
                }),
        );

        // Simulate CMD+S key press
        const event = new KeyboardEvent("keydown", { key: "s", metaKey: true });
        window.dispatchEvent(event);

        expect(mockOnSave).not.toHaveBeenCalled();
        expect(mockOnNoChanges).not.toHaveBeenCalled();
    });

    it("does nothing when CMD+S when there's no active file", () => {
        const mockOnSave = vi.fn();
        const mockOnNoChanges = vi.fn();

        renderHook(
            () =>
                useKeyboardShortcuts({
                    isSignedIn: true,
                    activeFileId: null,
                    hasUnsavedChanges: true,
                    onSave: mockOnSave,
                    onNoChanges: mockOnNoChanges,
                }),
        );

        // Simulate CMD+S key press
        const event = new KeyboardEvent("keydown", { key: "s", metaKey: true });
        window.dispatchEvent(event);

        expect(mockOnSave).not.toHaveBeenCalled();
        expect(mockOnNoChanges).not.toHaveBeenCalled();
    });

    it("behaves the same when CTRL+S is pressed for Windows / Linux platforms as CMD+S", () => {
        const mockOnSave = vi.fn();
        const mockOnNoChanges = vi.fn();

        renderHook(
            () =>
                useKeyboardShortcuts({
                    isSignedIn: true,   
                    activeFileId: 1,
                    hasUnsavedChanges: true,
                    onSave: mockOnSave,
                    onNoChanges: mockOnNoChanges,
                }),
        );

        // Simulate CTRL+S key press
        const event = new KeyboardEvent("keydown", { key: "s", ctrlKey: true });
        window.dispatchEvent(event);    

        expect(mockOnSave).toHaveBeenCalled();
    });

    it("cleans-up the listener for CMD+S / CTRL+S and is removed on unmount", () => {
        const mockOnSave = vi.fn();
        const mockOnNoChanges = vi.fn();

        const { unmount } = renderHook(
            () =>
                useKeyboardShortcuts({
                    isSignedIn: true,
                    activeFileId: 1,
                    hasUnsavedChanges: true,
                    onSave: mockOnSave,
                    onNoChanges: mockOnNoChanges,
                }),
        );

        unmount();

        // Simulate CMD+S key press after unmount
        const event = new KeyboardEvent("keydown", { key: "s", metaKey: true });
        window.dispatchEvent(event);

        expect(mockOnSave).not.toHaveBeenCalled();
        expect(mockOnNoChanges).not.toHaveBeenCalled();

        // Simulate CTRL+S key press
        const windowKeyEvent = new KeyboardEvent("keydown", { key: "s", ctrlKey: true });
        window.dispatchEvent(windowKeyEvent);

        expect(mockOnSave).not.toHaveBeenCalled();
        expect(mockOnNoChanges).not.toHaveBeenCalled();
    });
});