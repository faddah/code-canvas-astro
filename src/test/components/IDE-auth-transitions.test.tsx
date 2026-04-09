import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mutable auth state
let mockUserId: string | null = null;
const mockSignOut = vi.fn();

const stableUser = { primaryEmailAddress: { emailAddress: "user@test.com" } };

vi.mock("@clerk/astro/react", () => ({
  useAuth: () => ({ userId: mockUserId, signOut: mockSignOut }),
  SignInButton: ({ children }: any) => <div>{children}</div>,
  SignUpButton: ({ children }: any) => <div>{children}</div>,
  SignOutButton: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@clerk/astro/client", () => ({
  $userStore: { get: () => (mockUserId ? stableUser : null), listen: () => () => {} },
}));

vi.mock("@/hooks/use-pyodide", () => ({
  usePyodide: () => ({
    isReady: true, isRunning: false, output: [], htmlOutput: "",
    runCode: vi.fn(), clearConsole: vi.fn(), isWaitingForInput: false, submitInput: vi.fn(),
  }),
}));

let mockStarterFilesData: any[] | undefined = [
  { id: 1, name: "starter.py", content: "# starter", projectId: null },
];

vi.mock("@/hooks/use-files", () => ({
  useStarterFiles: () => ({
    data: mockStarterFilesData,
    isLoading: false,
  }),
  useUserFiles: () => ({
    data: mockUserId
      ? [
          { id: 10, name: "user-file.py", content: "# user", projectId: null },
          { id: 11, name: "user-lib.py", content: "# lib", projectId: null },
        ]
      : undefined,
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  }),
  useCreateUserFile: () => ({ mutateAsync: vi.fn(), mutate: vi.fn() }),
  useUpdateUserFile: () => ({ mutateAsync: vi.fn(), mutate: vi.fn() }),
  useDeleteUserFile: () => ({ mutateAsync: vi.fn(), mutate: vi.fn() }),
}));

vi.mock("@/hooks/use-projects", () => ({
  useProjects: () => ({ data: [] }),
  useCreateProject: () => ({ mutate: vi.fn() }),
  useDeleteProject: () => ({ mutate: vi.fn() }),
  useMoveFileToProject: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/use-user-profile", () => ({
  useUserProfile: () => ({
    data: mockUserId ? { phone: "+1 555" } : null,
    isLoading: false,
    isSuccess: true,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn(), toasts: [] }),
}));

// Monaco Editor
vi.mock("@monaco-editor/react", () => ({
  default: (props: any) => (
    <div data-testid="monaco-editor" data-value={props.value}>Editor</div>
  ),
  Editor: (props: any) => (
    <div data-testid="monaco-editor" data-value={props.value}>Editor</div>
  ),
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: any) => <div>{children}</div>,
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

vi.mock("../../package.json", () => ({ version: "0.0.0" }));
vi.mock("@/components/ConsolePanel", () => ({ ConsolePanel: () => null }));
vi.mock("@/components/WebPreview", () => ({ WebPreview: () => null }));
vi.mock("@/components/SaveDialog", () => ({ SaveDialog: () => null }));
vi.mock("@/components/OpenImportDialog", () => ({ OpenImportDialog: () => null }));
vi.mock("@/components/CompleteProfile", () => ({ CompleteProfile: () => null }));
vi.mock("@/components/UserProfileModal", () => ({ UserProfileModal: () => null }));

import IDE from "@/components/IDE";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("IDE auth transitions", () => {
  beforeEach(() => {
    mockUserId = null;
    mockStarterFilesData = [
      { id: 1, name: "starter.py", content: "# starter", projectId: null },
    ];
    document.getElementById = vi.fn().mockReturnValue(null);
  });

  it("handles login transition: clears tabs and shows user files", async () => {
    mockUserId = null;
    const Wrap = createWrapper();
    const { rerender } = render(<IDE />, { wrapper: Wrap });

    // Verify starter files shown
    await waitFor(() => expect(screen.getAllByText("starter.py").length).toBeGreaterThanOrEqual(1));

    // "Login" — change userId
    mockUserId = "user_123";
    rerender(<IDE />);

    // After login, user files should eventually appear
    await waitFor(() => {
      expect(screen.getAllByText("user-file.py").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("handles logout transition: resets to starter files", async () => {
    mockUserId = "user_123";
    const Wrap = createWrapper();
    const { rerender } = render(<IDE />, { wrapper: Wrap });

    await waitFor(() => expect(screen.getAllByText("user-file.py").length).toBeGreaterThanOrEqual(1));

    // "Logout" — clear userId
    mockUserId = null;
    rerender(<IDE />);

    // After logout, should show starter files
    await waitFor(() => {
      expect(screen.getAllByText("starter.py").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("does not seed local files when starterFiles is an empty array", async () => {
    mockStarterFilesData = [];
    mockUserId = null;
    const Wrap = createWrapper();
    render(<IDE />, { wrapper: Wrap });

    // With no starter files and not signed in, explorer should show no file entries
    // The "Select a file to edit" placeholder should appear since no file is active
    await waitFor(() => {
      expect(screen.getByText("Select a file to edit")).toBeInTheDocument();
    });

    // No file tabs or names should be rendered
    expect(screen.queryByText("starter.py")).not.toBeInTheDocument();
  });

  it("login transition clears unsaved changes and resets tabs", async () => {
    mockUserId = null;
    const Wrap = createWrapper();
    const { rerender } = render(<IDE />, { wrapper: Wrap });

    // Verify starter files shown and active
    await waitFor(() => expect(screen.getAllByText("starter.py").length).toBeGreaterThanOrEqual(1));

    // "Login" — change userId
    mockUserId = "user_123";
    rerender(<IDE />);

    // After login, tabs should reset — starter.py tab should disappear,
    // user files should eventually load
    await waitFor(() => {
      expect(screen.getAllByText("user-file.py").length).toBeGreaterThanOrEqual(1);
    });

    // The old starter.py should no longer be in the tab bar
    // (it may still appear momentarily, but user files should be the active ones)
    await waitFor(() => {
      expect(screen.queryByText("starter.py")).not.toBeInTheDocument();
    });
  });
});
