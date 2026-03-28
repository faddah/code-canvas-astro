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

// Helper to render ExplorerPane with common defaults
function renderExplorer(overrides: Record<string, any> = {}, handlersOverride?: Record<string, any>) {
  const handlers = {
    onOpenFile: vi.fn(),
    onDeleteFile: vi.fn(),
    onCreateFile: vi.fn(),
    onCreateProject: vi.fn(),
    onDeleteProject: vi.fn(),
    onMoveFile: vi.fn(),
    onRetry: vi.fn(),
    ...handlersOverride,
  };
  const props = {
    files: mockFiles,
    projects: mockProjects,
    activeFileId: 1 as number | null,
    unsavedChanges: {} as Record<number, string>,
    isSignedIn: true,
    isLoading: false,
    isError: false,
    ...overrides,
  };
  const result = render(<ExplorerPane {...props} {...handlers} />);
  return { ...result, handlers };
}

// Helper to find a draggable file element by name
function getDraggableFile(name: string) {
  return screen.getByText(name).closest("[draggable]") as HTMLElement;
}

describe("ExplorerPane", () => {
  // ── Basic rendering ──

  it("renders Explorer header", () => {
    renderExplorer();
    expect(screen.getByText("Explorer")).toBeInTheDocument();
  });

  it("renders loose files (no project)", () => {
    renderExplorer();
    expect(screen.getByText("main.py")).toBeInTheDocument();
    expect(screen.getByText("notes.txt")).toBeInTheDocument();
  });

  it("renders project names", () => {
    renderExplorer();
    expect(screen.getByText("My Project")).toBeInTheDocument();
  });

  it("renders file with default icon for unknown extension", () => {
    renderExplorer({
      files: [
        { id: 1, name: "data.json", projectId: null, content: "{}" },
        { id: 2, name: "other.py", projectId: null, content: "# x" },
      ],
    });
    expect(screen.getByText("data.json")).toBeInTheDocument();
  });

  it("renders .txt file", () => {
    renderExplorer();
    expect(screen.getByText("notes.txt")).toBeInTheDocument();
  });

  // ── Project expand/collapse ──

  it("expands project to show nested files", () => {
    renderExplorer();
    expect(screen.queryByText("utils.py")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("My Project"));
    expect(screen.getByText("utils.py")).toBeInTheDocument();
    expect(screen.getByText("helper.py")).toBeInTheDocument();
  });

  it("collapses expanded project", () => {
    renderExplorer();
    fireEvent.click(screen.getByText("My Project"));
    expect(screen.getByText("utils.py")).toBeInTheDocument();
    fireEvent.click(screen.getByText("My Project"));
    expect(screen.queryByText("utils.py")).not.toBeInTheDocument();
  });

  it("shows empty project message when expanded project has no files", () => {
    renderExplorer({
      files: [{ id: 1, name: "main.py", projectId: null, content: "# main" }],
    });
    fireEvent.click(screen.getByText("My Project"));
    expect(screen.getByText(/No files — drag files here/)).toBeInTheDocument();
  });

  it("shows file count badge on project", () => {
    renderExplorer();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  // ── File interactions ──

  it("calls onOpenFile when clicking a file", () => {
    const { handlers } = renderExplorer({ activeFileId: null });
    fireEvent.click(screen.getByText("main.py"));
    expect(handlers.onOpenFile).toHaveBeenCalledWith(1);
  });

  it("shows unsaved indicator for modified files", () => {
    const { container } = renderExplorer({ unsavedChanges: { 1: "# modified" } });
    const yellowDots = container.querySelectorAll(".bg-yellow-500");
    expect(yellowDots.length).toBeGreaterThan(0);
  });

  it("highlights the active file", () => {
    renderExplorer({ activeFileId: 1 });
    const fileRow = screen.getByText("main.py").closest("div[class*='cursor-pointer']");
    expect(fileRow?.className).toContain("bg-primary/10");
  });

  // ── Loading / Error / Empty states ──

  it("shows loading state", () => {
    renderExplorer({ files: [], projects: [], isLoading: true });
    expect(screen.getByText("Loading your files...")).toBeInTheDocument();
  });

  it("shows error state with retry button", () => {
    const { handlers } = renderExplorer({ files: [], projects: [], isError: true });
    expect(screen.getByText("Could not load files")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Retry"));
    expect(handlers.onRetry).toHaveBeenCalled();
  });

  it("shows empty state when no files or projects", () => {
    renderExplorer({ files: [], projects: [], activeFileId: null });
    expect(screen.getByText("No files yet")).toBeInTheDocument();
  });

  // ── Footer ──

  it("renders footer with copyright and feedback link", () => {
    renderExplorer();
    expect(screen.getByText("Send Feedback")).toBeInTheDocument();
    expect(screen.getByText(/186,000 miles/)).toBeInTheDocument();
  });

  it("Send Feedback link sets window.location.href to mailto", () => {
    renderExplorer();
    const link = screen.getByText("Send Feedback");
    // The click handler sets window.location.href
    const hrefSetter = vi.fn();
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window.location, "href", {
      set: hrefSetter,
      get: () => "",
      configurable: true,
    });
    fireEvent.click(link);
    expect(hrefSetter).toHaveBeenCalledWith(
      expect.stringContaining("mailto:")
    );
  });

  // ── Draggable files ──

  it("supports drag start on files when signed in", () => {
    renderExplorer();
    const fileEl = getDraggableFile("main.py");
    expect(fileEl).toBeTruthy();
    expect(fileEl.getAttribute("draggable")).toBe("true");
  });

  it("files are not draggable when not signed in", () => {
    renderExplorer({
      files: [{ id: 1, name: "main.py", projectId: null, content: "# main" }],
      projects: [],
      isSignedIn: false,
    });
    const fileEl = screen.getByText("main.py").closest("div[class*='cursor-pointer']");
    expect(fileEl?.getAttribute("draggable")).not.toBe("true");
  });
});
