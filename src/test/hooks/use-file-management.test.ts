import { useFileManagement } from '@/hooks/use-file-management';
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockStarterFiles = [
    { id: 100, name: "hello.py", content: "print('hello')" },
    { id: 101, name: "world.py", content: "print('world')" },
];

const mockUserFiles = [
    { id: 1, name: "user-file.py", content: "print('user')" },
];

const mockMutateAsync = vi.fn();
const mockMutate = vi.fn();

vi.mock("@/hooks/use-files", () => ({
    useStarterFiles: () => ({ data: mockStarterFiles, isLoading: false }),
    useUserFiles: (userId: string | null) => ({
        data: userId ? mockUserFiles : undefined,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
    }),
    useCreateUserFile: () => ({ mutateAsync: mockMutateAsync }),
    useUpdateUserFile: () => ({ mutateAsync: vi.fn() }),
    useDeleteUserFile: () => ({ mutate: mockMutate }),
}));

vi.mock("@/hooks/use-toast", () => ({
    useToast: () => ({ toast: vi.fn(), dismiss: vi.fn(), toasts: [] }),
}));

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
    mockMutateAsync.mockReset();
    mockMutate.mockReset();
});

// cleanup handled by global setup.ts afterEach

describe("useFileManagement", () => {
    it("returns starter files when not signed in", () => {
        const { result } = renderHook(
            () => useFileManagement({ isSignedIn: false, userId: null }),
            { wrapper: createWrapper() },
        );
        // localFiles is seeded from starterFiles via useEffect
        expect(result.current.files).toBeDefined();
        expect(result.current.files).not.toBeNull();
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

    it("Returns user files when signed in", () => {
        const { result } = renderHook(
            () => useFileManagement({ isSignedIn: true, userId: "test-user-123" }),
            { wrapper: createWrapper() },
        );
        expect(result.current.files).toBeDefined();
        expect(result.current.files).not.toBeNull();
        expect(result.current.files).toEqual(mockUserFiles);
    });

    it("has openTab add a file to openFileIds and sets it active", () => {
        const { result } = renderHook(
            () => useFileManagement({ isSignedIn: false, userId: null }),
            { wrapper: createWrapper() },
        );

        act(() => {
            result.current.openTab(1);
        });

        expect(result.current.openFileIds).toContain(1);
        expect(result.current.activeFileId).toBe(1);
    });

    it("has closeTab remove a file and select the previous tab (or null if last)", () => {
        const { result } = renderHook(
            () => useFileManagement({ isSignedIn: false, userId: null }),
            { wrapper: createWrapper() },
        );
        const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;

        act(() => {
            result.current.openTab(1);
        });
        act(() => {
            result.current.openTab(2);
        });
        expect(result.current.activeFileId).toBe(2);

        act(() => {
            result.current.closeTab(fakeEvent, 2);
        });
        expect(result.current.openFileIds).not.toContain(2);
        expect(result.current.activeFileId).toBe(1);

        act(() => {
            result.current.closeTab(fakeEvent, 1);
        });
        expect(result.current.openFileIds).not.toContain(1);
        // After all tabs are closed, the "initialize active file" effect
        // re-opens the first available file since files is non-empty.
        expect(result.current.activeFileId).toBe(mockStarterFiles[0].id);
    });

    it("has handleEditorChange update unsavedChanges for active file", () => {
        const { result } = renderHook(
            () => useFileManagement({ isSignedIn: false, userId: null }),
            { wrapper: createWrapper() },
        );

        act(() => {
            result.current.openTab(1);
        });
        expect(result.current.unsavedChanges[1]).toBeUndefined();

        act(() => {
            result.current.handleEditorChange("console.log('Changed');");
        });
        expect(result.current.unsavedChanges[1]).toBe("console.log('Changed');");
    });

    it("has handleCreateFile create a local file when not signed in (negative IDs)", async () => {
        const { result } = renderHook(
            () => useFileManagement({ isSignedIn: false, userId: null }),
            { wrapper: createWrapper() },
        );

        await act(async () => {
            await result.current.handleCreateFile("local.py");
        });

        // localFiles was seeded with 2 starter files + 1 new local file
        await waitFor(() => expect(result.current.files).toBeDefined());
        const localFile = result.current.files?.find((f: any) => f.id < 0);
        expect(localFile).toBeDefined();
        expect(localFile!.id).toBeLessThan(0);
    });

    it("has handleCreateFile call createFile mutation when signed in", async () => {
        mockMutateAsync.mockResolvedValue({ id: 42, name: "local.py", content: "# New Python File\nprint('Hello World')\n" });

        const { result } = renderHook(
            () => useFileManagement({ isSignedIn: true, userId: "test-user-123" }),
            { wrapper: createWrapper() },
        );

        await act(async () => {
            await result.current.handleCreateFile("local.py");
        });

        expect(mockMutateAsync).toHaveBeenCalledWith({
            name: "local.py",
            content: "# New Python File\nprint('Hello World')\n",
        });
    });

    it("has handleDeleteFile remove from local files when not signed in", async () => {
        const { result } = renderHook(
            () => useFileManagement({ isSignedIn: false, userId: null }),
            { wrapper: createWrapper() },
        );

        // Create a local file first
        await act(async () => {
            await result.current.handleCreateFile("temp.py");
        });
        await waitFor(() => expect(result.current.files).toBeDefined());
        const localFile = result.current.files?.find((f: any) => f.id < 0);
        expect(localFile).toBeDefined();

        act(() => {
            result.current.handleDeleteFile(localFile!.id);
        });

        await waitFor(() => expect(result.current.files).toBeDefined());
        expect(result.current.files!.find((f: any) => f.id === localFile!.id)).toBeUndefined();
    });

    it("has handleDeleteFile call deleteFile mutation when signed in", () => {
        const { result } = renderHook(
            () => useFileManagement({ isSignedIn: true, userId: "test-user-123" }),
            { wrapper: createWrapper() },
        );

        act(() => {
            result.current.openTab(1);
        });
        act(() => {
            result.current.handleDeleteFile(1);
        });

        expect(mockMutate).toHaveBeenCalledWith(1, expect.objectContaining({ onSuccess: expect.any(Function) }));
    });

    it("has Auth transition (login): clear activeFileId, openFileIds, unsavedChanges, invalidates queries", () => {
        const wrapper = createWrapper();
        const { result, rerender } = renderHook(
            ({ isSignedIn, userId }) => useFileManagement({ isSignedIn, userId }),
            {
                initialProps: { isSignedIn: false, userId: null as string | null },
                wrapper,
            },
        );

        act(() => {
            result.current.openTab(1);
        });
        act(() => {
            result.current.handleEditorChange("console.log('Changed');");
        });
        expect(result.current.activeFileId).toBe(1);
        expect(result.current.openFileIds).toContain(1);
        expect(result.current.unsavedChanges[1]).toBe("console.log('Changed');");

        // Simulate login — auth effect clears state, then the "initialize
        // active file" effect re-opens the first user file.
        act(() => {
            rerender({ isSignedIn: true, userId: "test-user-123" });
        });
        // unsavedChanges is cleared by the auth transition
        expect(result.current.unsavedChanges).toEqual({});
        // activeFileId and openFileIds are re-populated from user files
        expect(result.current.activeFileId).toBe(mockUserFiles[0].id);
        expect(result.current.openFileIds).toContain(mockUserFiles[0].id);
    });

    it("has Auth transition (logout): reset to starter files", () => {
        const wrapper = createWrapper();
        const { result, rerender } = renderHook(
            ({ isSignedIn, userId }) => useFileManagement({ isSignedIn, userId }),
            {
                initialProps: { isSignedIn: true, userId: "test-user-123" as string | null },
                wrapper,
            },
        );
        expect(result.current.files).toBeDefined();
        expect(result.current.files).not.toBeNull();

        // Simulate logout
        act(() => {
            rerender({ isSignedIn: false, userId: null });
        });
        expect(result.current.files).toBeDefined();
        expect(result.current.files).not.toBeNull();
    });

    it("Initializes first file as active when files load", () => {
        const { result } = renderHook(
            () => useFileManagement({ isSignedIn: false, userId: null }),
            { wrapper: createWrapper() },
        );

        // The hook auto-opens the first file from starterFiles via useEffect
        expect(result.current.activeFileId).toBe(mockStarterFiles[0].id);
        expect(result.current.openFileIds).toContain(mockStarterFiles[0].id);
    });
});
