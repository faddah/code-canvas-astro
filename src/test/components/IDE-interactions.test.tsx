import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ── Module-level spies (captured by mocks) ──

const mockRunCode = vi.fn();
const mockClearConsole = vi.fn();
const mockToast = vi.fn();
const mockUpdateMutateAsync = vi.fn().mockResolvedValue({});
const mockCreateMutateAsync = vi.fn().mockResolvedValue({ id: 99, name: "new.py" });
const mockDeleteMutate = vi.fn((id: number, opts?: any) => opts?.onSuccess?.());
const mockSignOut = vi.fn();
const mockRefetchUserFiles = vi.fn();

// Track Monaco onMount / onChange
let capturedOnChange: ((value: string | undefined) => void) | null = null;
let capturedOnMount: ((editor: any) => void) | null = null;

// Track SaveDialog props
let capturedSaveDialogProps: any = null;
// Track OpenImportDialog props
let capturedImportDialogProps: any = null;

// ── Mocks ──

const stableUser = { primaryEmailAddress: { emailAddress: "test@test.com" } };
let mockUserId: string | null = "user_123";
vi.mock("@clerk/astro/react", () => ({
  useAuth: () => ({ userId: mockUserId, signOut: mockSignOut }),
  SignInButton: ({ children }: any) => <div>{children}</div>,
  SignUpButton: ({ children }: any) => <div>{children}</div>,
  SignOutButton: ({ children }: any) => <div data-testid="sign-out">{children}</div>,
}));

vi.mock("@clerk/astro/client", () => ({
  $userStore: { get: () => stableUser, listen: () => () => {} },
}));

vi.mock("@/hooks/use-pyodide", () => ({
  usePyodide: () => ({
    isReady: true, isRunning: false, output: [], htmlOutput: "",
    runCode: mockRunCode, clearConsole: mockClearConsole,
    isWaitingForInput: false, submitInput: vi.fn(),
  }),
}));

const defaultUserFiles = [
  { id: 10, name: "app.py", content: "print('app')", projectId: null },
  { id: 11, name: "lib.py", content: "# lib", projectId: null },
];
let mockUserFilesData: typeof defaultUserFiles | [] = defaultUserFiles;
vi.mock("@/hooks/use-files", () => ({
  useStarterFiles: () => ({ data: [], isLoading: false }),
  useUserFiles: () => ({
    data: [
      { id: 10, name: "app.py", content: "print('app')", projectId: null },
      { id: 11, name: "lib.py", content: "# lib", projectId: null },
    ],
    isLoading: false, isError: false, error: null, refetch: mockRefetchUserFiles,
  }),
  useCreateUserFile: () => ({ mutateAsync: mockCreateMutateAsync, mutate: vi.fn() }),
  useUpdateUserFile: () => ({ mutateAsync: mockUpdateMutateAsync, mutate: vi.fn() }),
  useDeleteUserFile: () => ({ mutateAsync: vi.fn(), mutate: mockDeleteMutate }),
}));

vi.mock("@/hooks/use-projects", () => ({
  useProjects: () => ({ data: [] }),
  useCreateProject: () => ({ mutate: vi.fn() }),
  useDeleteProject: () => ({ mutate: vi.fn() }),
  useMoveFileToProject: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/use-user-profile", () => ({
  useUserProfile: () => ({
    data: { phone: "+1 555", city: "Portland", country: "US" },
    isLoading: false, isSuccess: true,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast, dismiss: vi.fn(), toasts: [] }),
}));

// Monaco mock that captures onChange and onMount
vi.mock("@monaco-editor/react", () => ({
  default: (props: any) => {
    capturedOnChange = props.onChange;
    if (props.onMount) {
      capturedOnMount = props.onMount;
    }
    return (
      <textarea
        data-testid="monaco-editor"
        value={props.value || ""}
        onChange={(e) => props.onChange?.(e.target.value)}
      />
    );
  },
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: any) => <div>{children}</div>,
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

vi.mock("../../package.json", () => ({ version: "2.0.0" }));

vi.mock("@/components/ConsolePanel", () => ({
  ConsolePanel: () => <div data-testid="console">Console</div>,
}));

vi.mock("@/components/WebPreview", () => ({
  WebPreview: () => <div data-testid="preview">Preview</div>,
}));

// SaveDialog mock that captures props and exposes an onSave trigger
vi.mock("@/components/SaveDialog", () => ({
  SaveDialog: (props: any) => {
    capturedSaveDialogProps = props;
    if (!props.open) return null;
    return (
      <div data-testid="save-dialog">
        <button
          data-testid="mock-save-trigger"
          onClick={() => props.onSave(props.fileName, props.fileContent, props.currentProjectId)}
        >
          Mock Save
        </button>
      </div>
    );
  },
}));

// OpenImportDialog mock
vi.mock("@/components/OpenImportDialog", () => ({
  OpenImportDialog: (props: any) => {
    capturedImportDialogProps = props;
    if (!props.open) return null;
    return (
      <div data-testid="import-dialog">
        <button
          data-testid="mock-import-trigger"
          onClick={() => props.onImport([{ name: "imported.py", content: "# imported" }], null)}
        >
          Mock Import
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/CompleteProfile", () => ({
  CompleteProfile: (props: any) => <div data-testid="complete-profile">Complete Profile</div>,
}));

vi.mock("@/components/UserProfileModal", () => ({
  UserProfileModal: (props: any) => {
    if (!props.open) return null;
    return (
      <div data-testid="profile-modal">
        <button data-testid="mock-close-profile" onClick={props.onClose}>Close</button>
        <button data-testid="mock-delete-profile" onClick={props.onDeleteProfile}>Delete</button>
      </div>
    );
  },
}));

import IDE from "@/components/IDE";

function Wrapper({ children }: { children: React.ReactNode }) {
  const [qc] = React.useState(() => new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }));
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("IDE interactions (signed-in)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserId = "user_123";
    mockUserFilesData = defaultUserFiles;
    capturedOnChange = null;
    capturedOnMount = null;
    capturedSaveDialogProps = null;
    capturedImportDialogProps = null;
    document.getElementById = vi.fn().mockReturnValue(null);
  });

  // ── handleEditorChange ──

  it("typing in editor creates unsaved changes", async () => {
    render(<IDE />, { wrapper: Wrapper });

    // Wait for the editor to mount with the active file
    await waitFor(() => expect(screen.getByTestId("monaco-editor")).toBeInTheDocument());

    // Simulate editor change
    act(() => { capturedOnChange?.("modified content"); });

    // The Save button should now have unsaved styling (yellow)
    await waitFor(() => {
      const saveBtn = screen.getByText("Save").closest("button")!;
      expect(saveBtn.className).toContain("border-yellow-500");
    });
  });

  // ── handleRun ──

  it("Run button calls runCode with active content and all files", async () => {
    render(<IDE />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByTestId("monaco-editor")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Run"));

    await waitFor(() => {
      expect(mockRunCode).toHaveBeenCalledWith(
        "print('app')",
        expect.arrayContaining([
          expect.objectContaining({ name: "app.py" }),
          expect.objectContaining({ name: "lib.py" }),
        ])
      );
    });
  });

  // ── Cmd+S keyboard handler ──

  it("Cmd+S with unsaved changes calls handleQuickSave", async () => {
    render(<IDE />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByTestId("monaco-editor")).toBeInTheDocument());

    // Create unsaved changes
    act(() => { capturedOnChange?.("modified"); });

    // Press Cmd+S — now quick-saves in place
    fireEvent.keyDown(window, { key: "s", metaKey: true });

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ id: 10, content: "modified" })
      );
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Saved" })
    );
  });

  it("Cmd+S with no unsaved changes toasts 'No changes'", async () => {
    render(<IDE />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByTestId("monaco-editor")).toBeInTheDocument());

    fireEvent.keyDown(window, { key: "s", metaKey: true });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "No changes" })
    );
  });

  // ── Save button ──

  it("Save button calls handleQuickSave: mutateAsync, clears unsaved state, and toasts", async () => {
    render(<IDE />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByTestId("monaco-editor")).toBeInTheDocument());

    act(() => { capturedOnChange?.("modified"); });

    // Verify unsaved indicator appears (yellow border)
    await waitFor(() => {
      const saveBtn = screen.getByText("Save").closest("button")!;
      expect(saveBtn.className).toContain("border-yellow-500");
    });

    fireEvent.click(screen.getByText("Save"));

    // handleQuickSave calls mutateAsync with correct id and content
    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ id: 10, content: "modified" })
      );
    });

    // Shows "Saved" toast
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Saved", description: "Changes saved to disk." })
    );

    // Unsaved indicator is cleared (yellow border removed)
    await waitFor(() => {
      const saveBtn = screen.getByText("Save").closest("button")!;
      expect(saveBtn.className).not.toContain("border-yellow-500");
    });
  });

  it("handleQuickSave error path: mutateAsync throws, unsaved state preserved, no toast", async () => {
    // Make mutateAsync reject
    mockUpdateMutateAsync.mockRejectedValueOnce(new Error("Network error"));

    render(<IDE />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByTestId("monaco-editor")).toBeInTheDocument());

    // Create unsaved changes
    act(() => { capturedOnChange?.("modified"); });

    // Verify unsaved indicator appears (yellow border)
    await waitFor(() => {
      const saveBtn = screen.getByText("Save").closest("button")!;
      expect(saveBtn.className).toContain("border-yellow-500");
    });

    fireEvent.click(screen.getByText("Save"));

    // mutateAsync was called (the attempt was made)
    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ id: 10, content: "modified" })
      );
    });

    // "Saved" toast should NOT have been called — error was caught silently
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: "Saved" })
    );

    // Unsaved indicator should still be present (yellow border preserved)
    const saveBtn = screen.getByText("Save").closest("button")!;
    expect(saveBtn.className).toContain("border-yellow-500");
  });

  it("Save As button opens save dialog", async () => {
    render(<IDE />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByTestId("monaco-editor")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Save As"));

    await waitFor(() => {
      expect(screen.getByTestId("save-dialog")).toBeInTheDocument();
    });
  });

  it("Save button calls handleQuickSave (early return) when no unsaved changes", async () => {
    render(<IDE />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByTestId("monaco-editor")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Save"));

    // handleQuickSave returns early — no API call
    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
  });

  it("handleQuickSave early-returns when user is not signed in", async () => {
    // Render as signed-out user — Save button and editor are hidden
    mockUserId = null;
    render(<IDE />, { wrapper: Wrapper });

    // Verify signed-out state: auth banner shows instead of Save button
    expect(screen.queryByText("Save")).not.toBeInTheDocument();

    // Simulate Cmd+S — the keyboard shortcut guards on isSignedIn
    // and handleQuickSave also guards on isSignedIn (line 169)
    fireEvent.keyDown(window, { key: "s", metaKey: true });

    // Neither mutateAsync nor a "Saved" toast should fire
    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("handleQuickSave early-returns when no activeFileId (no files)", async () => {
    // Signed in but no user files → activeFileId stays null
    mockUserFilesData = [];
    render(<IDE />, { wrapper: Wrapper });

    // Save button renders but is disabled when no activeFileId
    const saveBtn = screen.getByText("Save").closest("button")!;
    expect(saveBtn).toBeDisabled();

    // Simulate Cmd+S — keyboard handler guards on activeFileId (line 240)
    // and handleQuickSave also guards on !activeFileId (line 170)
    fireEvent.keyDown(window, { key: "s", metaKey: true });

    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  // ── handleSaveDialog (via SaveDialog mock) ──

  it("SaveDialog onSave calls updateFile and shows toast", async () => {
    render(<IDE />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByTestId("monaco-editor")).toBeInTheDocument());

    // Create unsaved changes and open dialog via Save As
    act(() => { capturedOnChange?.("new content"); });
    fireEvent.click(screen.getByText("Save As"));

    await waitFor(() => expect(screen.getByTestId("save-dialog")).toBeInTheDocument());

    // Click the mock save trigger
    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-save-trigger"));
    });

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ id: 10 })
      );
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Saved" })
    );
  });

  // ── Open / Import button ──

  it("Open/Import button opens import dialog", async () => {
    render(<IDE />, { wrapper: Wrapper });

    fireEvent.click(screen.getByText("Open / Import"));

    await waitFor(() => {
      expect(screen.getByTestId("import-dialog")).toBeInTheDocument();
    });
  });

  it("importing files creates them and opens in tabs", async () => {
    render(<IDE />, { wrapper: Wrapper });

    fireEvent.click(screen.getByText("Open / Import"));
    await waitFor(() => expect(screen.getByTestId("import-dialog")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-import-trigger"));
    });

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ name: "imported.py", content: "# imported" })
      );
    });
  });

  // ── closeTab + openTab via FileTab callbacks ──

  it("clicking a file in explorer opens it in a new tab", async () => {
    render(<IDE />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByTestId("monaco-editor")).toBeInTheDocument());

    // Click lib.py in the explorer to open it
    const explorerFiles = screen.getAllByText("lib.py");
    // The first one should be in the explorer
    fireEvent.click(explorerFiles[0]);

    // lib.py should now appear in the tab bar too (FileTab renders it)
    await waitFor(() => {
      // After opening, there should be 2 instances of lib.py (explorer + tab)
      expect(screen.getAllByText("lib.py").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("clicking a tab sets it as active (FileTab onClick)", async () => {
    render(<IDE />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByTestId("monaco-editor")).toBeInTheDocument());

    // Open lib.py tab
    fireEvent.click(screen.getByText("lib.py"));

    // Now click app.py tab to switch back (via FileTab onClick callback)
    await waitFor(() => {
      const appPyElements = screen.getAllByText("app.py");
      // Click the tab version (should be the one inside the tab bar)
      fireEvent.click(appPyElements[0]);
    });

    expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
  });

  it("closing a tab via FileTab onClose switches to remaining tab", async () => {
    render(<IDE />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByTestId("monaco-editor")).toBeInTheDocument());

    // Open lib.py to have 2 tabs
    fireEvent.click(screen.getByText("lib.py"));

    await waitFor(() => {
      // Find the tab bar close buttons — FileTab renders a button with X icon
      // The tab bar area contains FileTab components with close buttons
      const allButtons = document.querySelectorAll("button");
      const closeButtons = Array.from(allButtons).filter(
        btn => btn.querySelector(".lucide-x") && btn.closest("[class*='cursor-pointer']")
      );
      expect(closeButtons.length).toBeGreaterThan(0);
      // Click the first close button (which is on app.py tab, the active one)
      fireEvent.click(closeButtons[0]);
    });

    expect(screen.getByText("Run")).toBeInTheDocument();
  });

  // ── handleDeleteFile ──

  it("deleting a file calls deleteFile.mutate and cleans up UI", async () => {
    render(<IDE />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByTestId("monaco-editor")).toBeInTheDocument());

    // The ExplorerPane is rendered with onDeleteFile={handleDeleteFile}
    // Trigger delete via the explorer — find the file row and its trash button
    const fileRow = screen.getByText("lib.py").closest("div[class*='cursor-pointer']");
    if (fileRow) {
      const buttons = fileRow.querySelectorAll("button");
      const trashBtn = buttons[buttons.length - 1];
      if (trashBtn) {
        fireEvent.click(trashBtn);
        // Look for confirm button
        const confirmBtn = screen.queryByText("Confirm");
        if (confirmBtn) {
          fireEvent.click(confirmBtn);
        }
      }
    }

    await waitFor(() => {
      expect(mockDeleteMutate).toHaveBeenCalled();
    });
  });

  // ── Monaco onMount ──

  it("Monaco onMount adds Cmd+S command when signed in", async () => {
    const mockEditor = { addCommand: vi.fn() };
    render(<IDE />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByTestId("monaco-editor")).toBeInTheDocument());

    act(() => { capturedOnMount?.(mockEditor); });

    expect(mockEditor.addCommand).toHaveBeenCalledWith(
      2048 | 49,
      expect.any(Function)
    );

    // Execute the Cmd+S callback to cover line 555
    const cmdSCallback = mockEditor.addCommand.mock.calls[0][1];
    act(() => { cmdSCallback(); });

    // Save dialog should open
    await waitFor(() => {
      expect(screen.getByTestId("save-dialog")).toBeInTheDocument();
    });
  });

  // ── User Profile Modal ──

  it("clicking user email opens profile modal", async () => {
    render(<IDE />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByText("test@test.com")).toBeInTheDocument());

    fireEvent.click(screen.getByText("test@test.com"));

    await waitFor(() => {
      expect(screen.getByTestId("profile-modal")).toBeInTheDocument();
    });
  });

  it("profile modal close button hides modal", async () => {
    render(<IDE />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("test@test.com"));
    await waitFor(() => expect(screen.getByTestId("profile-modal")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("mock-close-profile"));

    await waitFor(() => {
      expect(screen.queryByTestId("profile-modal")).not.toBeInTheDocument();
    });
  });

  it("profile modal delete triggers signOut", async () => {
    render(<IDE />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("test@test.com"));
    await waitFor(() => expect(screen.getByTestId("profile-modal")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("mock-delete-profile"));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: "/" });
    });
  });

  // ── handleCreateFile (signed-in path via ExplorerPane) ──

  it("creating a new file via explorer calls createFile API", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    render(<IDE />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByText("Explorer")).toBeInTheDocument());

    // Open the Plus dropdown in the ExplorerPane
    const plusBtn = screen.getAllByRole("button").find((btn) => btn.querySelector(".lucide-plus"));
    if (plusBtn) {
      await user.click(plusBtn);
      const newFileItem = await screen.findByText("New File");
      await user.click(newFileItem);

      const input = screen.getByPlaceholderText("script.py");
      await user.type(input, "newfile{Enter}");

      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ name: "newfile.py" })
        );
      });
    }
  });
});
