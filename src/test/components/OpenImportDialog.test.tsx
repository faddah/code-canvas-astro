import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OpenImportDialog } from "@/components/OpenImportDialog";
import type { Project } from "@shared/schema";

const mockProjects: Project[] = [
  { id: 1, clerkUserId: "u1", name: "Project A", description: null, createdAt: new Date(), updatedAt: new Date() },
];

function createMockFile(name: string, content: string): File {
  return new File([content], name, { type: "text/plain" });
}

describe("OpenImportDialog", () => {
  let onImport: ReturnType<typeof vi.fn>;
  let onOpenChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onImport = vi.fn();
    onOpenChange = vi.fn();
  });

  it("renders when open", () => {
    render(
      <OpenImportDialog
        open={true}
        onOpenChange={onOpenChange}
        projects={[]}
        onImport={onImport}
      />
    );

    expect(screen.getByText("Open / Import Files")).toBeInTheDocument();
    expect(screen.getByText(/Click to select/)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <OpenImportDialog
        open={false}
        onOpenChange={onOpenChange}
        projects={[]}
        onImport={onImport}
      />
    );

    expect(screen.queryByText("Open / Import Files")).not.toBeInTheDocument();
  });

  it("accepts .py files", async () => {
    render(
      <OpenImportDialog
        open={true}
        onOpenChange={onOpenChange}
        projects={[]}
        onImport={onImport}
      />
    );

    const input = screen.getByTestId("file-input") as HTMLInputElement;
    const file = createMockFile("script.py", "print('hello')");

    await fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("script.py")).toBeInTheDocument();
    });
  });

  it("accepts .txt files", async () => {
    render(
      <OpenImportDialog
        open={true}
        onOpenChange={onOpenChange}
        projects={[]}
        onImport={onImport}
      />
    );

    const input = screen.getByTestId("file-input") as HTMLInputElement;
    const file = createMockFile("notes.txt", "some notes");

    await fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("notes.txt")).toBeInTheDocument();
    });
  });

  it("rejects non-.py/.txt files with error message", async () => {
    render(
      <OpenImportDialog
        open={true}
        onOpenChange={onOpenChange}
        projects={[]}
        onImport={onImport}
      />
    );

    const input = screen.getByTestId("file-input") as HTMLInputElement;
    const file = createMockFile("image.png", "binary data");

    await fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Skipped non-.py\/.txt files: image.png/)).toBeInTheDocument();
    });
  });

  it("can remove a selected file", async () => {
    render(
      <OpenImportDialog
        open={true}
        onOpenChange={onOpenChange}
        projects={[]}
        onImport={onImport}
      />
    );

    const input = screen.getByTestId("file-input") as HTMLInputElement;
    const file = createMockFile("script.py", "print('hello')");

    await fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("script.py")).toBeInTheDocument();
    });

    // Click the remove button (X icon)
    const removeButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector("svg")
    );
    // Find the remove button next to the file
    const removeBtn = screen.getByText("script.py").closest("div")?.querySelector("button");
    if (removeBtn) {
      fireEvent.click(removeBtn);
    }

    await waitFor(() => {
      expect(screen.queryByText("script.py")).not.toBeInTheDocument();
    });
  });

  it("disables Open/Import button when no files are selected", () => {
    render(
      <OpenImportDialog
        open={true}
        onOpenChange={onOpenChange}
        projects={[]}
        onImport={onImport}
      />
    );

    const importBtn = screen.getByRole("button", { name: /open \/ import/i });
    expect(importBtn).toBeDisabled();
    expect(onImport).not.toHaveBeenCalled();
  });

  it("calls onImport with selected files", async () => {
    render(
      <OpenImportDialog
        open={true}
        onOpenChange={onOpenChange}
        projects={[]}
        onImport={onImport}
      />
    );

    const input = screen.getByTestId("file-input") as HTMLInputElement;
    const file = createMockFile("script.py", "print('hello')");

    await fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("script.py")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /open \/ import/i }));
    expect(onImport).toHaveBeenCalledWith(
      [{ name: "script.py", content: "print('hello')" }],
      null
    );
  });

  it("shows project selector when projects exist", () => {
    render(
      <OpenImportDialog
        open={true}
        onOpenChange={onOpenChange}
        projects={mockProjects}
        onImport={onImport}
      />
    );

    expect(screen.getByText("Import into Project (optional)")).toBeInTheDocument();
  });

  it("Cancel button calls onOpenChange(false)", () => {
    render(
      <OpenImportDialog
        open={true}
        onOpenChange={onOpenChange}
        projects={[]}
        onImport={onImport}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Open/Import button is disabled when no files selected", () => {
    render(
      <OpenImportDialog
        open={true}
        onOpenChange={onOpenChange}
        projects={[]}
        onImport={onImport}
      />
    );

    const importBtn = screen.getByRole("button", { name: /open \/ import/i });
    expect(importBtn).toBeDisabled();
  });
});
