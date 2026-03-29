import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,  // add this
  DialogFooter,
} from "@/components/ui/dialog";
import { OpenImportDialog } from "@/components/OpenImportDialog";
import type { Project } from "@shared/schema";
import type { Mock } from "vitest";

const mockProjects: Project[] = [
  { id: 1, clerkUserId: "u1", name: "Project A", description: null, createdAt: new Date(), updatedAt: new Date() },
];

function createMockFile(name: string, content: string): File {
  return new File([content], name, { type: "text/plain" });
}

describe("OpenImportDialog", () => {
  let onImport: Mock<(files: { name: string; content: string }[], projectId: number | null) => void>;
  let onOpenChange: Mock<(open: boolean) => void>;

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

  it("shows error for rejected files while keeping valid files", async () => {
    render(
      <OpenImportDialog
        open={true}
        onOpenChange={onOpenChange}
        projects={[]}
        onImport={onImport}
      />
    );

    const input = screen.getByTestId("file-input") as HTMLInputElement;
    const validFile = createMockFile("app.py", "print('hi')");
    const invalidFile = createMockFile("image.png", "binary");

    await fireEvent.change(input, { target: { files: [validFile, invalidFile] } });

    await waitFor(() => {
      // Error shows the rejected file
      expect(screen.getByText(/Skipped non-.py\/.txt files: image.png/)).toBeInTheDocument();
      // Valid file is still listed
      expect(screen.getByText("app.py")).toBeInTheDocument();
    });
  });

  it("click-to-select button triggers file input click", () => {
    render(
      <OpenImportDialog
        open={true}
        onOpenChange={onOpenChange}
        projects={[]}
        onImport={onImport}
      />
    );

    // The hidden file input
    const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, "click");

    // Click the "Click to select .py or .txt files" button
    const selectBtn = screen.getByText(/Click to select/).closest("button")!;
    fireEvent.click(selectBtn);

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it("imports files and closes dialog on success", async () => {
    render(
      <OpenImportDialog
        open={true}
        onOpenChange={onOpenChange}
        projects={[]}
        onImport={onImport}
      />
    );

    // Add a file
    const input = screen.getByTestId("file-input") as HTMLInputElement;
    const file = createMockFile("app.py", "x = 1");
    await fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("app.py")).toBeInTheDocument();
    });

    // Click import — should call onImport and close via onOpenChange(false)
    fireEvent.click(screen.getByRole("button", { name: /open \/ import/i }));

    expect(onImport).toHaveBeenCalledWith(
      [{ name: "app.py", content: "x = 1" }],
      null
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
