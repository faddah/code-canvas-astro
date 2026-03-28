import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExplorerPane } from "@/components/ExplorerPane";
import type { Project } from "@shared/schema";

const mockFiles = [
  { id: 1, name: "main.py", projectId: null, content: "# main" },
  { id: 2, name: "utils.py", projectId: 1, content: "# utils" },
  { id: 3, name: "notes.txt", projectId: null, content: "notes" },
  { id: 4, name: "helper.py", projectId: 1, content: "# helper" },
];

const mockProjects: Project[] = [
  { id: 1, clerkUserId: "u1", name: "My Project", description: null, createdAt: new Date(), updatedAt: new Date() },
];

describe("ExplorerPane", () => {
  let handlers: {
    onOpenFile: ReturnType<typeof vi.fn>;
    onDeleteFile: ReturnType<typeof vi.fn>;
    onCreateFile: ReturnType<typeof vi.fn>;
    onCreateProject: ReturnType<typeof vi.fn>;
    onDeleteProject: ReturnType<typeof vi.fn>;
    onMoveFile: ReturnType<typeof vi.fn>;
    onRetry: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    handlers = {
      onOpenFile: vi.fn(),
      onDeleteFile: vi.fn(),
      onCreateFile: vi.fn(),
      onCreateProject: vi.fn(),
      onDeleteProject: vi.fn(),
      onMoveFile: vi.fn(),
      onRetry: vi.fn(),
    };
  });

  it("renders Explorer header", () => {
    render(
      <ExplorerPane
        files={mockFiles}
        projects={mockProjects}
        activeFileId={1}
        unsavedChanges={{}}
        isSignedIn={true}
        isLoading={false}
        isError={false}
        {...handlers}
      />
    );

    expect(screen.getByText("Explorer")).toBeInTheDocument();
  });

  it("renders loose files (no project)", () => {
    render(
      <ExplorerPane
        files={mockFiles}
        projects={mockProjects}
        activeFileId={1}
        unsavedChanges={{}}
        isSignedIn={true}
        isLoading={false}
        isError={false}
        {...handlers}
      />
    );

    expect(screen.getByText("main.py")).toBeInTheDocument();
    expect(screen.getByText("notes.txt")).toBeInTheDocument();
  });

  it("renders project names", () => {
    render(
      <ExplorerPane
        files={mockFiles}
        projects={mockProjects}
        activeFileId={1}
        unsavedChanges={{}}
        isSignedIn={true}
        isLoading={false}
        isError={false}
        {...handlers}
      />
    );

    expect(screen.getByText("My Project")).toBeInTheDocument();
  });

  it("expands project to show nested files", () => {
    render(
      <ExplorerPane
        files={mockFiles}
        projects={mockProjects}
        activeFileId={1}
        unsavedChanges={{}}
        isSignedIn={true}
        isLoading={false}
        isError={false}
        {...handlers}
      />
    );

    // Files in project should not be visible initially
    expect(screen.queryByText("utils.py")).not.toBeInTheDocument();

    // Click to expand project
    fireEvent.click(screen.getByText("My Project"));

    // Now project files should be visible
    expect(screen.getByText("utils.py")).toBeInTheDocument();
    expect(screen.getByText("helper.py")).toBeInTheDocument();
  });

  it("collapses expanded project", () => {
    render(
      <ExplorerPane
        files={mockFiles}
        projects={mockProjects}
        activeFileId={1}
        unsavedChanges={{}}
        isSignedIn={true}
        isLoading={false}
        isError={false}
        {...handlers}
      />
    );

    // Expand
    fireEvent.click(screen.getByText("My Project"));
    expect(screen.getByText("utils.py")).toBeInTheDocument();

    // Collapse
    fireEvent.click(screen.getByText("My Project"));
    expect(screen.queryByText("utils.py")).not.toBeInTheDocument();
  });

  it("calls onOpenFile when clicking a file", () => {
    render(
      <ExplorerPane
        files={mockFiles}
        projects={mockProjects}
        activeFileId={null}
        unsavedChanges={{}}
        isSignedIn={true}
        isLoading={false}
        isError={false}
        {...handlers}
      />
    );

    fireEvent.click(screen.getByText("main.py"));
    expect(handlers.onOpenFile).toHaveBeenCalledWith(1);
  });

  it("shows unsaved indicator for modified files", () => {
    const { container } = render(
      <ExplorerPane
        files={mockFiles}
        projects={mockProjects}
        activeFileId={1}
        unsavedChanges={{ 1: "# modified" }}
        isSignedIn={true}
        isLoading={false}
        isError={false}
        {...handlers}
      />
    );

    // Yellow dot indicator
    const yellowDots = container.querySelectorAll(".bg-yellow-500");
    expect(yellowDots.length).toBeGreaterThan(0);
  });

  it("shows loading state", () => {
    render(
      <ExplorerPane
        files={[]}
        projects={[]}
        activeFileId={null}
        unsavedChanges={{}}
        isSignedIn={true}
        isLoading={true}
        isError={false}
        {...handlers}
      />
    );

    expect(screen.getByText("Loading your files...")).toBeInTheDocument();
  });

  it("shows error state with retry button", () => {
    render(
      <ExplorerPane
        files={[]}
        projects={[]}
        activeFileId={null}
        unsavedChanges={{}}
        isSignedIn={true}
        isLoading={false}
        isError={true}
        {...handlers}
      />
    );

    expect(screen.getByText("Could not load files")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Retry"));
    expect(handlers.onRetry).toHaveBeenCalled();
  });

  it("shows empty state when no files or projects", () => {
    render(
      <ExplorerPane
        files={[]}
        projects={[]}
        activeFileId={null}
        unsavedChanges={{}}
        isSignedIn={true}
        isLoading={false}
        isError={false}
        {...handlers}
      />
    );

    expect(screen.getByText("No files yet")).toBeInTheDocument();
  });

  it("shows file count badge on project", () => {
    render(
      <ExplorerPane
        files={mockFiles}
        projects={mockProjects}
        activeFileId={1}
        unsavedChanges={{}}
        isSignedIn={true}
        isLoading={false}
        isError={false}
        {...handlers}
      />
    );

    // The project shows file count (2 files)
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders footer with copyright and feedback link", () => {
    render(
      <ExplorerPane
        files={mockFiles}
        projects={[]}
        activeFileId={1}
        unsavedChanges={{}}
        isSignedIn={true}
        isLoading={false}
        isError={false}
        {...handlers}
      />
    );

    expect(screen.getByText("Send Feedback")).toBeInTheDocument();
    expect(screen.getByText(/186,000 miles/)).toBeInTheDocument();
  });

  it("supports drag start on files when signed in", () => {
    render(
      <ExplorerPane
        files={mockFiles}
        projects={mockProjects}
        activeFileId={1}
        unsavedChanges={{}}
        isSignedIn={true}
        isLoading={false}
        isError={false}
        {...handlers}
      />
    );

    const fileEl = screen.getByText("main.py").closest("[draggable]");
    expect(fileEl).toBeTruthy();
    expect(fileEl?.getAttribute("draggable")).toBe("true");
  });

  it("files are not draggable when not signed in", () => {
    render(
      <ExplorerPane
        files={[{ id: 1, name: "main.py", projectId: null, content: "# main" }]}
        projects={[]}
        activeFileId={1}
        unsavedChanges={{}}
        isSignedIn={false}
        isLoading={false}
        isError={false}
        {...handlers}
      />
    );

    const fileEl = screen.getByText("main.py").closest("div[class*='cursor-pointer']");
    // Should not have draggable=true when not signed in
    expect(fileEl?.getAttribute("draggable")).not.toBe("true");
  });
});
