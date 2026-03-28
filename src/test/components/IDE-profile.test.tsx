import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Signed-in user with NO profile (triggers CompleteProfile)
const stableUser = { primaryEmailAddress: { emailAddress: "new@test.com" } };

vi.mock("@clerk/astro/react", () => ({
  useAuth: () => ({ userId: "user_new", signOut: vi.fn() }),
  SignInButton: ({ children }: any) => <div>{children}</div>,
  SignUpButton: ({ children }: any) => <div>{children}</div>,
  SignOutButton: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@clerk/astro/client", () => ({
  $userStore: { get: () => stableUser, listen: () => () => {} },
}));

vi.mock("@/hooks/use-pyodide", () => ({
  usePyodide: () => ({
    isReady: true, isRunning: false, output: [], htmlOutput: "",
    runCode: vi.fn(), clearConsole: vi.fn(), isWaitingForInput: false, submitInput: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-files", () => ({
  useStarterFiles: () => ({ data: [], isLoading: false }),
  useUserFiles: () => ({
    data: [{ id: 1, name: "a.py", content: "# a", projectId: null }],
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

// Profile is null → triggers CompleteProfile modal
vi.mock("@/hooks/use-user-profile", () => ({
  useUserProfile: () => ({
    data: null,
    isLoading: false,
    isSuccess: true,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn(), toasts: [] }),
}));

vi.mock("@monaco-editor/react", () => ({
  default: () => <div data-testid="editor">Editor</div>,
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

// CompleteProfile mock that captures onComplete/onCancel
vi.mock("@/components/CompleteProfile", () => ({
  CompleteProfile: (props: any) => (
    <div data-testid="complete-profile">
      <button data-testid="complete-btn" onClick={props.onComplete}>Complete</button>
      <button data-testid="cancel-btn" onClick={props.onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock("@/components/UserProfileModal", () => ({
  UserProfileModal: () => null,
}));

import IDE from "@/components/IDE";

function Wrapper({ children }: { children: React.ReactNode }) {
  const [qc] = React.useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("IDE CompleteProfile flow", () => {
  beforeEach(() => {
    document.getElementById = vi.fn().mockReturnValue(null);
  });

  it("shows CompleteProfile when signed in with no profile", async () => {
    render(<IDE />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByTestId("complete-profile")).toBeInTheDocument();
    });
  });

  it("hides CompleteProfile when onComplete is called", async () => {
    render(<IDE />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByTestId("complete-profile")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("complete-btn"));

    await waitFor(() => {
      expect(screen.queryByTestId("complete-profile")).not.toBeInTheDocument();
    });
  });

  it("hides CompleteProfile when onCancel is called", async () => {
    render(<IDE />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByTestId("complete-profile")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("cancel-btn"));

    await waitFor(() => {
      expect(screen.queryByTestId("complete-profile")).not.toBeInTheDocument();
    });
  });
});
