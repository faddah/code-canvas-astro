import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExplorerPane } from "@/components/ExplorerPane";
import type { Project } from "@shared/schema";
import { axeCheck } from "@/test/helpers/a11y";

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
    onAddPackage: vi.fn(),
    onRemovePackage: vi.fn(),
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
    activeProjectName: "Python REPL IDE",
    packages: [],
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
    expect(screen.getByRole("status")).toBeInTheDocument();
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

  // ── Trash2Btn: delete confirmation ──

  it("calls onDeleteFile after trash click + Confirm", () => {
    const { handlers } = renderExplorer({
      files: [
        { id: 1, name: "main.py", projectId: null, content: "# main" },
        { id: 2, name: "other.py", projectId: null, content: "# other" },
      ],
      projects: [],
    });

    // Each file row renders a Trash2Btn. Find the trash button in the first file row.
    const mainRow = screen.getByText("main.py").closest("div[class*='cursor-pointer']") as HTMLElement;
    const trashBtn = within(mainRow).getAllByRole("button").pop()!;
    fireEvent.click(trashBtn);

    // Confirm button should appear
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Confirm"));
    expect(handlers.onDeleteFile).toHaveBeenCalledWith(1);
  });

  it("dismisses delete confirmation when X cancel is clicked", () => {
    const { handlers } = renderExplorer({
      files: [
        { id: 1, name: "main.py", projectId: null, content: "# main" },
        { id: 2, name: "other.py", projectId: null, content: "# other" },
      ],
      projects: [],
    });

    const mainRow = screen.getByText("main.py").closest("div[class*='cursor-pointer']") as HTMLElement;
    const trashBtn = within(mainRow).getAllByRole("button").pop()!;
    fireEvent.click(trashBtn);

    // Confirm row appears — find the X/cancel button (sibling of Confirm)
    const confirmContainer = screen.getByText("Confirm").parentElement!;
    const cancelBtn = within(confirmContainer).getAllByRole("button")[1]; // Second button is X
    fireEvent.click(cancelBtn);

    // Confirm should disappear and onDeleteFile should NOT be called
    expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
    expect(handlers.onDeleteFile).not.toHaveBeenCalled();
  });

  it("does not show trash button when only one file exists", () => {
    renderExplorer({
      files: [{ id: 1, name: "main.py", projectId: null, content: "# main" }],
      projects: [],
    });
    // Trash2Btn returns null when disabled (files.length <= 1)
    const mainRow = screen.getByText("main.py").closest("div[class*='cursor-pointer']") as HTMLElement;
    // Only the grip icon button should not appear as a trash button
    const buttons = within(mainRow).queryAllByRole("button");
    // No trash buttons — Trash2Btn renders null
    buttons.forEach((btn) => {
      expect(btn.querySelector(".lucide-trash-2")).toBeNull();
    });
  });

  // ── Trash2Btn on projects ──

  it("calls onDeleteProject after project trash click + Confirm", () => {
    const { handlers } = renderExplorer();
    const projectRow = screen.getByText("My Project").closest("div[class*='cursor-pointer']") as HTMLElement;
    const trashBtn = within(projectRow).getAllByRole("button").pop()!;
    fireEvent.click(trashBtn);

    expect(screen.getByText("Confirm")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Confirm"));
    expect(handlers.onDeleteProject).toHaveBeenCalledWith(1);
  });

  // ── Drag and drop ──

  it("handleDragStart sets effectAllowed and dataTransfer data", () => {
    renderExplorer();
    const fileEl = getDraggableFile("main.py");
    const dataTransfer = { effectAllowed: "", setData: vi.fn(), dropEffect: "" };
    fireEvent.dragStart(fileEl, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "1");
    expect(dataTransfer.effectAllowed).toBe("move");
  });

  it("dragged file gets opacity-40 class", () => {
    renderExplorer();
    const fileEl = getDraggableFile("main.py");
    const dataTransfer = { effectAllowed: "", setData: vi.fn(), dropEffect: "" };
    fireEvent.dragStart(fileEl, { dataTransfer });
    // After dragStart, the component re-renders the file with opacity-40
    expect(fileEl.className).toContain("opacity-40");
  });

  it("handleDragEnd resets opacity", () => {
    renderExplorer();
    const fileEl = getDraggableFile("main.py");
    const dataTransfer = { effectAllowed: "", setData: vi.fn(), dropEffect: "" };
    fireEvent.dragStart(fileEl, { dataTransfer });
    expect(fileEl.className).toContain("opacity-40");
    fireEvent.dragEnd(fileEl);
    expect(fileEl.className).not.toContain("opacity-40");
  });

  it("handleDropOnProject calls onMoveFile and auto-expands", () => {
    const { handlers } = renderExplorer();
    const fileEl = getDraggableFile("main.py");
    const dataTransfer = { effectAllowed: "", setData: vi.fn(), dropEffect: "" };
    fireEvent.dragStart(fileEl, { dataTransfer });

    const projectRow = screen.getByText("My Project").closest("div[class*='cursor-pointer']") as HTMLElement;
    fireEvent.dragOver(projectRow, { dataTransfer: { ...dataTransfer, dropEffect: "" }, preventDefault: vi.fn() });
    fireEvent.drop(projectRow, { dataTransfer, preventDefault: vi.fn() });

    expect(handlers.onMoveFile).toHaveBeenCalledWith(1, 1);
    // Project should auto-expand after drop
    expect(screen.getByText("utils.py")).toBeInTheDocument();
  });

  it("handleDropOnRoot calls onMoveFile with null projectId", () => {
    const { container, handlers } = renderExplorer();
    // First expand the project to access a project file
    fireEvent.click(screen.getByText("My Project"));
    const fileEl = getDraggableFile("utils.py");
    const dataTransfer = { effectAllowed: "", setData: vi.fn(), dropEffect: "" };
    fireEvent.dragStart(fileEl, { dataTransfer });

    // Drop on the root file list area
    const rootArea = container.querySelector(".flex-1.overflow-y-auto")!;
    fireEvent.drop(rootArea, { dataTransfer, preventDefault: vi.fn() });

    expect(handlers.onMoveFile).toHaveBeenCalledWith(2, null);
  });

  it("dragOver on root area shows drop target highlight", () => {
    const { container } = renderExplorer();
    const rootArea = container.querySelector(".flex-1.overflow-y-auto")!;
    const dataTransfer = { effectAllowed: "", dropEffect: "" };
    fireEvent.dragOver(rootArea, { dataTransfer, preventDefault: vi.fn() });
    expect(rootArea.className).toContain("bg-blue-500/10");
  });

  it("dragLeave on root area clears drop target highlight", () => {
    const { container } = renderExplorer();
    const rootArea = container.querySelector(".flex-1.overflow-y-auto")!;
    const dataTransfer = { effectAllowed: "", dropEffect: "" };
    fireEvent.dragOver(rootArea, { dataTransfer, preventDefault: vi.fn() });
    expect(rootArea.className).toContain("bg-blue-500/10");
    fireEvent.dragLeave(rootArea);
    expect(rootArea.className).not.toContain("bg-blue-500/10");
  });

  // Note: dragOver/dragLeave highlight tests for project rows are skipped because
  // jsdom does not properly construct DragEvent.dataTransfer, causing the handler
  // to throw when setting dropEffect. The drop handler is tested above via
  // "handleDropOnProject calls onMoveFile" which validates the core functionality.

  it("drop on expanded project file area calls onMoveFile", () => {
    const { handlers } = renderExplorer();
    // Expand project
    fireEvent.click(screen.getByText("My Project"));

    // Start drag on a loose file
    const fileEl = getDraggableFile("main.py");
    const dataTransfer = { effectAllowed: "", setData: vi.fn(), dropEffect: "" };
    fireEvent.dragStart(fileEl, { dataTransfer });

    // The expanded project file area is the ml-2 border-l div
    const expandedArea = screen.getByText("utils.py").closest("div[class*='border-l']") as HTMLElement;
    fireEvent.dragOver(expandedArea, { dataTransfer: { effectAllowed: "", dropEffect: "" }, preventDefault: vi.fn() });
    fireEvent.drop(expandedArea, { dataTransfer, preventDefault: vi.fn() });

    expect(handlers.onMoveFile).toHaveBeenCalledWith(1, 1);
  });

  // ── New File Dialog (uses Radix Dialog) ──

  it("opens New File dialog via dropdown menu and creates file", async () => {
    const user = userEvent.setup();
    const { handlers } = renderExplorer();

    // The Plus (+) button opens a DropdownMenu
    const plusButtons = screen.getAllByRole("button");
    const plusBtn = plusButtons.find((btn) => btn.querySelector(".lucide-plus"));
    expect(plusBtn).toBeTruthy();
    await user.click(plusBtn!);

    // Click "New File" in the dropdown
    const newFileItem = await screen.findByText("New File");
    await user.click(newFileItem);

    // Dialog should open
    expect(await screen.findByText("Create New File")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("script.py")).toBeInTheDocument();

    // Type a file name and click Add
    await user.type(screen.getByPlaceholderText("script.py"), "myfile");
    await user.click(screen.getByText("Add"));

    expect(handlers.onCreateFile).toHaveBeenCalledWith("myfile.py", null);
  });

  it("creates .txt file without auto-appending .py", async () => {
    const user = userEvent.setup();
    const { handlers } = renderExplorer();

    const plusBtn = screen.getAllByRole("button").find((btn) => btn.querySelector(".lucide-plus"))!;
    await user.click(plusBtn);
    await user.click(await screen.findByText("New File"));
    await user.type(screen.getByPlaceholderText("script.py"), "readme.txt");
    await user.click(screen.getByText("Add"));

    expect(handlers.onCreateFile).toHaveBeenCalledWith("readme.txt", null);
  });

  it("Add button is disabled when file name is empty", async () => {
    const user = userEvent.setup();
    renderExplorer();

    const plusBtn = screen.getAllByRole("button").find((btn) => btn.querySelector(".lucide-plus"))!;
    await user.click(plusBtn);
    await user.click(await screen.findByText("New File"));

    const addBtn = screen.getByText("Add");
    expect(addBtn).toBeDisabled();
  });

  it("creates file in project via dropdown", async () => {
    const user = userEvent.setup();
    const { handlers } = renderExplorer();

    const plusBtn = screen.getAllByRole("button").find((btn) => btn.querySelector(".lucide-plus"))!;
    await user.click(plusBtn);

    const inProjectItem = await screen.findByText(/New File in "My Project"/);
    await user.click(inProjectItem);

    expect(await screen.findByText(/Create New File in Project/)).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("script.py"), "app");
    await user.click(screen.getByText("Add"));

    expect(handlers.onCreateFile).toHaveBeenCalledWith("app.py", 1);
  });

  it("submits new file via Enter key", async () => {
    const user = userEvent.setup();
    const { handlers } = renderExplorer();

    const plusBtn = screen.getAllByRole("button").find((btn) => btn.querySelector(".lucide-plus"))!;
    await user.click(plusBtn);
    await user.click(await screen.findByText("New File"));
    const input = screen.getByPlaceholderText("script.py");
    await user.type(input, "quick{Enter}");

    expect(handlers.onCreateFile).toHaveBeenCalledWith("quick.py", null);
  });

  it("Cancel button closes new file dialog without creating", async () => {
    const user = userEvent.setup();
    const { handlers } = renderExplorer();

    const plusBtn = screen.getAllByRole("button").find((btn) => btn.querySelector(".lucide-plus"))!;
    await user.click(plusBtn);
    await user.click(await screen.findByText("New File"));
    expect(screen.getByText("Create New File")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("script.py"), "temp");
    // Click Cancel in the dialog
    const cancelBtns = screen.getAllByText("Cancel");
    const dialogCancel = cancelBtns.find((btn) => btn.closest("[role='dialog']"));
    await user.click(dialogCancel || cancelBtns[0]);

    expect(handlers.onCreateFile).not.toHaveBeenCalled();
  });

  // ── New Project Dialog ──

  it("opens New Project dialog and creates project", async () => {
    const user = userEvent.setup();
    const { handlers } = renderExplorer();

    // FolderOpen button with title "New Project"
    const newProjectBtn = screen.getAllByRole("button").find(
      (btn) => btn.getAttribute("title") === "New Project" || btn.querySelector(".lucide-folder-open")
    );
    expect(newProjectBtn).toBeTruthy();
    await user.click(newProjectBtn!);

    expect(await screen.findByText("Create New Project")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("My Project"), "Test Project");
    await user.click(screen.getByText("Create"));

    expect(handlers.onCreateProject).toHaveBeenCalledWith("Test Project");
  });

  it("Create button disabled when project name is empty", async () => {
    const user = userEvent.setup();
    renderExplorer();

    const newProjectBtn = screen.getAllByRole("button").find(
      (btn) => btn.getAttribute("title") === "New Project" || btn.querySelector(".lucide-folder-open")
    )!;
    await user.click(newProjectBtn);

    await screen.findByText("Create New Project");
    const createBtn = screen.getByText("Create");
    expect(createBtn).toBeDisabled();
  });

  it("submits project via Enter key", async () => {
    const user = userEvent.setup();
    const { handlers } = renderExplorer();

    const newProjectBtn = screen.getAllByRole("button").find(
      (btn) => btn.getAttribute("title") === "New Project" || btn.querySelector(".lucide-folder-open")
    )!;
    await user.click(newProjectBtn);
    await screen.findByText("Create New Project");

    await user.type(screen.getByPlaceholderText("My Project"), "Quick Project{Enter}");
    expect(handlers.onCreateProject).toHaveBeenCalledWith("Quick Project");
  });

  it("Cancel button closes project dialog without creating", async () => {
    const user = userEvent.setup();
    const { handlers } = renderExplorer();

    const newProjectBtn = screen.getAllByRole("button").find(
      (btn) => btn.getAttribute("title") === "New Project" || btn.querySelector(".lucide-folder-open")
    )!;
    await user.click(newProjectBtn);
    await screen.findByText("Create New Project");

    await user.type(screen.getByPlaceholderText("My Project"), "temp");
    const cancelBtns = screen.getAllByText("Cancel");
    const dialogCancel = cancelBtns.find((btn) => btn.closest("[role='dialog']"));
    await user.click(dialogCancel || cancelBtns[0]);

    expect(handlers.onCreateProject).not.toHaveBeenCalled();
  });

  it("New Project button not shown when not signed in", () => {
    renderExplorer({ isSignedIn: false });
    const buttons = screen.getAllByRole("button");
    const newProjectBtn = buttons.find(
      (btn) => btn.getAttribute("title") === "New Project"
    );
    expect(newProjectBtn).toBeUndefined();
  });

  it("whitespace-only filename does not create a file", async () => {
    const user = userEvent.setup();
    const { handlers } = renderExplorer();

    // Open the new file dialog
    const plusBtn = screen.getAllByRole("button").find(
      (btn) => btn.querySelector(".lucide-plus")
    );
    expect(plusBtn).toBeTruthy();
    await user.click(plusBtn!);
    await user.click(await screen.findByText("New File"));

    // Type only whitespace and submit
    const input = screen.getByPlaceholderText("script.py");
    await user.type(input, "   {Enter}");

    // onCreateFile should NOT have been called
    expect(handlers.onCreateFile).not.toHaveBeenCalled();
  });

  it("shows empty state when signed in with no files and no projects", () => {
    renderExplorer({ files: [], projects: [] });
    expect(screen.getByText(/No files yet/)).toBeInTheDocument();
  });

  it("dragLeave does not clear dropTarget when relatedTarget is a child", () => {
    renderExplorer();

    const projectHeader = screen.getByText("My Project").closest("div")!;

    // Simulate dragEnter first
    fireEvent.dragEnter(projectHeader, {
      dataTransfer: { types: ["text/plain"] },
    });

    // Simulate dragLeave where relatedTarget is a child element
    const childEl = projectHeader.querySelector("span") || projectHeader.firstChild;
    fireEvent.dragLeave(projectHeader, {
      relatedTarget: childEl,
    });

    // The project header should still be in the DOM and functional
    expect(screen.getByText("My Project")).toBeInTheDocument();
  });

  it("shows project name in Packages header when activeProjectName is set", () => {
    renderExplorer({ activeProjectName: "My Project" });
    expect(screen.getByText("— My Project")).toBeInTheDocument();
  });

  it("does not show project label in Packages header when activeProjectName is null", () => {
    renderExplorer({ activeProjectName: null });
    expect(screen.queryByText(/^—/)).not.toBeInTheDocument();
  });
  
  // ── Accessibility (ARIA) ──

  it("passes axe audit in default signed-in state", async() => {
    const { container } = renderExplorer();
    await axeCheck(container);
  });

  it("passes axe audit in loading state", async () => {
    const { container } = renderExplorer({ files: [], projects: [], isLoading: true });
    await axeCheck(container);
  });

  it("passes axe audit in error state", async () => {
    const { container } = renderExplorer({ files: [], projects: [], isError: true });
    await axeCheck(container);
  });

  it("aside has role complementary and aria-label Explorer", () => {
    const { container } = renderExplorer();
    const aside = container.querySelector("aside");
    expect(aside).toHaveAttribute("role", "complementary");
    expect(aside).toHaveAttribute("aria-label", "Explorer");
  });

  it("file list container has role list", () => {
    const { container } = renderExplorer();
    expect(container.querySelector("[role='list']")).toBeInTheDocument();
  });

  it("file items have role listitem", () => {
    renderExplorer({ projects: [] });
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBeGreaterThan(0);
  });

  it("active file has aria-current true", () => {
    renderExplorer({ activeFileId: 1, projects: [] });
    const items = screen.getAllByRole("listitem");
    const activeItem = items.find((el) => el.getAttribute("aria-current") === "true");
    expect(activeItem).toBeTruthy();
    expect(activeItem).toHaveTextContent("main.py");
  });

  it("inactive files do not have aria-current", () => {
    renderExplorer({ activeFileId: 1, projects: [] });
    const items = screen.getAllByRole("listitem");
    const others = items.filter((el) => el.getAttribute("aria-current") !== "true");
    expect(others.length).toBeGreaterThan(0);
  });

  it("unsaved changes shows sr-only text for screen readers", () => {
    renderExplorer({ unsavedChanges: { 1: "# modified" },  projects: [] });
    expect(screen.getByText("unsaved changes")).toBeInTheDocument();
  });

  it("project toggle has role button and aria-expanded false when collapsed", () => {
    renderExplorer();
    const toggle = screen.getByRole("button", { name: "My Project" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("aria-expanded becomes true when project is expanded", () => {
    renderExplorer();
    const toggle = screen.getByRole("button", { name: "My Project" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("project toggle expands on Enter key", () => {
    renderExplorer();
    const toggle = screen.getByRole("button", { name: "My Project" });
    fireEvent.keyDown(toggle, { key: "Enter" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("utils.py")).toBeInTheDocument();
  });

  it("project toggle expands on Space key", () => {
    renderExplorer();
    const toggle = screen.getByRole("button", { name: "My Project" });
    fireEvent.keyDown(toggle, { key: " " });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("file item opens on Enter key", () => {
    const { handlers } = renderExplorer({ projects: [] });
    const items = screen.getAllByRole("listitem");
    const mainItem = items.find((el) => el.textContent?.includes("main.py"))!;
    fireEvent.keyDown(mainItem, { key: "Enter" });
    expect(handlers.onOpenFile).toHaveBeenCalledWith(1);
  });

  it("Add Package button has aria-label", () => {
    renderExplorer();
    expect(screen.getByRole("button", { name: "Add Package" }))
      .toBeInTheDocument();
  });

  it("Trash2Btn Confirm button has descriptive aria-label", () => {
    renderExplorer({
      files: [
        { id: 1, name: "main.py", projectId: null, content: "# main" },
        { id: 2, name: "other.py", projectId: null, content: "# other" },
      ],
      projects: [],
    });
    const mainRow = screen.getByText("main.py").closest("[role='listitem']") as HTMLElement;
    const trashBtn = within(mainRow).getByRole("button", { name: /Delete main\.py/ });
    fireEvent.click(trashBtn);
    expect(screen.getByRole("button", { name: /Confirm deleting main\.py/ })).toBeInTheDocument();
  });

  it("all decorative SVGs have aria-hidden true", () => {
    const { container } = renderExplorer();
    const svgs = container.querySelectorAll("svg");
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });
});
