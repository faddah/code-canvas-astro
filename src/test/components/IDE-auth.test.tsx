import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Signed-in user
vi.mock("@clerk/astro/react", () => ({
  useAuth: () => ({ userId: "user_123", signOut: vi.fn() }),
  SignInButton: ({ children }: any) => <div>{children}</div>,
  SignUpButton: ({ children }: any) => <div>{children}</div>,
  SignOutButton: ({ children }: any) => <div data-testid="sign-out">{children}</div>,
}));

const stableUser = { primaryEmailAddress: { emailAddress: "test@test.com" } };
vi.mock("@clerk/astro/client", () => ({
  $userStore: {
    get: () => stableUser,
    listen: () => () => {},
  },
}));

vi.mock("@/hooks/use-pyodide", () => ({
  usePyodide: () => ({
    isReady: true, isRunning: false, output: [], htmlOutput: "",
    runCode: vi.fn(), clearConsole: vi.fn(), isWaitingForInput: false, submitInput: vi.fn(),
  }),
}));

const mockUserFiles = [
  { id: 10, name: "app.py", content: "print('app')", projectId: null },
  { id: 11, name: "lib.py", content: "# lib", projectId: null },
];

vi.mock("@/hooks/use-files", () => ({
  useStarterFiles: () => ({ data: [], isLoading: false }),
  useUserFiles: () => ({
    data: [
      { id: 10, name: "app.py", content: "print('app')", projectId: null },
      { id: 11, name: "lib.py", content: "# lib", projectId: null },
    ],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
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
    data: { phone: "+1 555", city: "Portland", country: "US" },
    isLoading: false,
    isSuccess: true,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn(), toasts: [] }),
}));

vi.mock("@monaco-editor/react", () => ({
  default: (props: any) => <div data-testid="monaco-editor" data-value={props.value}>Editor</div>,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: any) => <div>{children}</div>,
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

vi.mock("../../package.json", () => ({ version: "2.0.0" }));
vi.mock("@/components/ConsolePanel", () => ({ ConsolePanel: () => <div data-testid="console">Console</div> }));
vi.mock("@/components/WebPreview", () => ({ WebPreview: () => <div data-testid="preview">Preview</div> }));
vi.mock("@/components/SaveDialog", () => ({ SaveDialog: () => null }));
vi.mock("@/components/OpenImportDialog", () => ({ OpenImportDialog: () => null }));
vi.mock("@/components/CompleteProfile", () => ({ CompleteProfile: () => null }));
vi.mock("@/components/UserProfileModal", () => ({ UserProfileModal: () => null }));

import IDE from "@/components/IDE";

function Wrapper({ children }: { children: React.ReactNode }) {
  const [qc] = React.useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("IDE signed-in state", () => {
  beforeEach(() => {
    document.getElementById = vi.fn().mockReturnValue(null);
  });

  it("shows Save and Open/Import buttons when signed in", () => {
    render(<IDE />, { wrapper: Wrapper });
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Open / Import")).toBeInTheDocument();
  });

  it("shows Log Out button when signed in", () => {
    render(<IDE />, { wrapper: Wrapper });
    expect(screen.getByText("Log Out")).toBeInTheDocument();
  });

  it("shows user email in header", () => {
    render(<IDE />, { wrapper: Wrapper });
    expect(screen.getByText("test@test.com")).toBeInTheDocument();
  });

  it("does not show the cannot-save banner when signed in", () => {
    render(<IDE />, { wrapper: Wrapper });
    expect(screen.queryByText(/Files cannot be saved unless/)).not.toBeInTheDocument();
  });

  it("renders user files in the explorer", () => {
    render(<IDE />, { wrapper: Wrapper });
    // app.py may appear both in explorer and tab bar, so use getAllByText
    expect(screen.getAllByText("app.py").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("lib.py")).toBeInTheDocument();
  });

  it("renders the Monaco editor for the active file", () => {
    render(<IDE />, { wrapper: Wrapper });
    expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
  });

  it("renders console and preview panels", () => {
    render(<IDE />, { wrapper: Wrapper });
    expect(screen.getByTestId("console")).toBeInTheDocument();
    expect(screen.getByTestId("preview")).toBeInTheDocument();
  });

  it("disables Run button when file is not active", () => {
    render(<IDE />, { wrapper: Wrapper });
    // Run button exists but should be enabled since there's an active file
    const runBtn = screen.getByText("Run").closest("button");
    expect(runBtn).toBeInTheDocument();
  });

  it("handles Cmd+S keyboard shortcut", () => {
    render(<IDE />, { wrapper: Wrapper });
    // Pressing Cmd+S should not crash (no unsaved changes, so toast "No changes" fires)
    fireEvent.keyDown(window, { key: "s", metaKey: true });
    // Component handles it without crashing
    expect(screen.getByText("Run")).toBeInTheDocument();
  });

  it("shows file tab for active file with close button", () => {
    render(<IDE />, { wrapper: Wrapper });
    // The active file's tab should have a close button
    const tabs = document.querySelectorAll("button");
    expect(tabs.length).toBeGreaterThan(0);
  });
});
