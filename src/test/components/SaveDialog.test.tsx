import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SaveDialog } from "@/components/SaveDialog";
import type { Project } from "@shared/schema";

const mockProjects: Project[] = [
  { id: 1, clerkUserId: "u1", name: "Project A", description: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 2, clerkUserId: "u1", name: "Project B", description: null, createdAt: new Date(), updatedAt: new Date() },
];

describe("SaveDialog", () => {
  let onSave: ReturnType<typeof vi.fn>;
  let onOpenChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSave = vi.fn();
    onOpenChange = vi.fn();
  });

  it("renders when open", () => {
    render(
      <SaveDialog
        open={true}
        onOpenChange={onOpenChange}
        fileName="test.py"
        fileContent="print('hi')"
        projects={[]}
        currentProjectId={null}
        onSave={onSave}
      />
    );

    expect(screen.getByText("Save File")).toBeInTheDocument();
    expect(screen.getByDisplayValue("test.py")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <SaveDialog
        open={false}
        onOpenChange={onOpenChange}
        fileName="test.py"
        fileContent="print('hi')"
        projects={[]}
        currentProjectId={null}
        onSave={onSave}
      />
    );

    expect(screen.queryByText("Save File")).not.toBeInTheDocument();
  });

  it("calls onSave with correct args for .py file", () => {
    render(
      <SaveDialog
        open={true}
        onOpenChange={onOpenChange}
        fileName="test.py"
        fileContent="print('hi')"
        projects={[]}
        currentProjectId={null}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith("test.py", "print('hi')", null);
  });

  it("calls onSave with correct args for .txt file", () => {
    render(
      <SaveDialog
        open={true}
        onOpenChange={onOpenChange}
        fileName="notes.txt"
        fileContent="some notes"
        projects={[]}
        currentProjectId={null}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith("notes.txt", "some notes", null);
  });

  it("shows error for disallowed file extension", () => {
    render(
      <SaveDialog
        open={true}
        onOpenChange={onOpenChange}
        fileName="test.py"
        fileContent="print('hi')"
        projects={[]}
        currentProjectId={null}
        onSave={onSave}
      />
    );

    const input = screen.getByDisplayValue("test.py");
    fireEvent.change(input, { target: { value: "image.png" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.getByText("Only .py and .txt files are allowed.")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("disables Save button when file name is empty", () => {
    render(
      <SaveDialog
        open={true}
        onOpenChange={onOpenChange}
        fileName=""
        fileContent="print('hi')"
        projects={[]}
        currentProjectId={null}
        onSave={onSave}
      />
    );

    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows error when name has only whitespace", () => {
    render(
      <SaveDialog
        open={true}
        onOpenChange={onOpenChange}
        fileName="test.py"
        fileContent="print('hi')"
        projects={[]}
        currentProjectId={null}
        onSave={onSave}
      />
    );

    // Set the value to whitespace only
    const input = screen.getByDisplayValue("test.py");
    fireEvent.change(input, { target: { value: "   " } });

    // Button should be disabled
    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn).toBeDisabled();
  });

  it("shows project selector when projects exist", () => {
    render(
      <SaveDialog
        open={true}
        onOpenChange={onOpenChange}
        fileName="test.py"
        fileContent="print('hi')"
        projects={mockProjects}
        currentProjectId={null}
        onSave={onSave}
      />
    );

    expect(screen.getByText("Project (optional)")).toBeInTheDocument();
  });

  it("hides project selector when no projects", () => {
    render(
      <SaveDialog
        open={true}
        onOpenChange={onOpenChange}
        fileName="test.py"
        fileContent="print('hi')"
        projects={[]}
        currentProjectId={null}
        onSave={onSave}
      />
    );

    expect(screen.queryByText("Project (optional)")).not.toBeInTheDocument();
  });

  it("Cancel button calls onOpenChange(false)", () => {
    render(
      <SaveDialog
        open={true}
        onOpenChange={onOpenChange}
        fileName="test.py"
        fileContent="print('hi')"
        projects={[]}
        currentProjectId={null}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Enter key triggers save", () => {
    render(
      <SaveDialog
        open={true}
        onOpenChange={onOpenChange}
        fileName="test.py"
        fileContent="print('hi')"
        projects={[]}
        currentProjectId={null}
        onSave={onSave}
      />
    );

    const input = screen.getByDisplayValue("test.py");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSave).toHaveBeenCalledWith("test.py", "print('hi')", null);
  });

  it("clears error when user types", () => {
    render(
      <SaveDialog
        open={true}
        onOpenChange={onOpenChange}
        fileName="bad.png"
        fileContent="data"
        projects={[]}
        currentProjectId={null}
        onSave={onSave}
      />
    );

    // Trigger error first
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(screen.getByText("Only .py and .txt files are allowed.")).toBeInTheDocument();

    // Type to clear
    const input = screen.getByDisplayValue("bad.png");
    fireEvent.change(input, { target: { value: "good.py" } });
    expect(screen.queryByText("Only .py and .txt files are allowed.")).not.toBeInTheDocument();
  });
});
