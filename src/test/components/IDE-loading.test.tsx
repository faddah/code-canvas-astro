import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Clerk auth
vi.mock("@clerk/astro/react", () => ({
  useAuth: () => ({ userId: null, signOut: vi.fn() }),
  SignInButton: ({ children }: any) => <div>{children}</div>,
  SignUpButton: ({ children }: any) => <div>{children}</div>,
  SignOutButton: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@clerk/astro/client", () => ({
  $userStore: { get: () => null, listen: () => () => {} },
}));

vi.mock("@/hooks/use-pyodide", () => ({
  usePyodide: () => ({
    isReady: false, isRunning: false, output: [], htmlOutput: "",
    runCode: vi.fn(), clearConsole: vi.fn(), isWaitingForInput: false, submitInput: vi.fn(),
  }),
}));

// Return loading state for starter files (mutable for transition tests)
let mockStarterLoading = true;
let mockStarterData: any = undefined;
vi.mock("@/hooks/use-files", () => ({
  useStarterFiles: () => ({ data: mockStarterData, isLoading: mockStarterLoading }),
  useUserFiles: () => ({ data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() }),
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
  useUserProfile: () => ({ data: null, isLoading: false, isSuccess: true }),
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

function Wrapper({ children }: { children: React.ReactNode }) {
  const [qc] = React.useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("IDE loading state", () => {
  beforeEach(() => {
    mockStarterLoading = true;
    mockStarterData = undefined;
    document.getElementById = vi.fn().mockReturnValue(null);
  });

  it("shows loading spinner when files are loading", () => {
    render(<IDE />, { wrapper: Wrapper });
    expect(screen.getByText("Initializing Environment...")).toBeInTheDocument();
  });

  it("shows the Loader2 spinner animation", () => {
    const { container } = render(<IDE />, { wrapper: Wrapper });
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("shows reload button after 10s loading timeout", () => {
    vi.useFakeTimers();
    render(<IDE />, { wrapper: Wrapper });

    expect(screen.queryByText(/Taking too long/)).not.toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(10_000); });

    expect(screen.getByText(/Taking too long/)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("reload button calls window.location.reload", () => {
    vi.useFakeTimers();
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { reload: reloadMock },
      writable: true,
      configurable: true,
    });

    render(<IDE />, { wrapper: Wrapper });
    act(() => { vi.advanceTimersByTime(10_000); });

    fireEvent.click(screen.getByText(/Taking too long/));
    expect(reloadMock).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("removes the app-loading element on mount", () => {
    const mockEl = { remove: vi.fn() };
    document.getElementById = vi.fn().mockReturnValue(mockEl);
    render(<IDE />, { wrapper: Wrapper });
    expect(mockEl.remove).toHaveBeenCalled();
  });

  it("clears loadingTooLong when loading finishes", () => {
    vi.useFakeTimers();
    const { rerender } = render(<IDE />, { wrapper: Wrapper });

    // Advance past the 10s timeout so loadingTooLong becomes true
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(screen.getByText(/Taking too long/)).toBeInTheDocument();

    // Now transition to not-loading
    mockStarterLoading = false;
    mockStarterData = [{ id: 1, name: "main.py", content: "print('hi')", projectId: null }];
    rerender(<IDE />);

    // The loading screen and retry button should disappear
    expect(screen.queryByText(/Taking too long/)).not.toBeInTheDocument();
    expect(screen.queryByText("Initializing Environment...")).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
