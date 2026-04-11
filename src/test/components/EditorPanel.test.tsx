import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Mock Monaco Editor
vi.mock("@monaco-editor/react", () => ({
    default: (props: any) => (
        <div data-testid="monaco-editor" data-value={props.value}>
        Editor
        </div>
    ),
    Editor: (props: any) => (
        <div data-testid="monaco-editor" data-value={props.value}>
        Editor
        </div>
    ),
}));

// Mock Resizable panels
vi.mock("@/components/ui/resizable", () => ({
    ResizablePanelGroup: ({ children }: any) => <div>{children}</div>,
    ResizablePanel: ({ children }: any) => <div>{children}</div>,
    ResizableHandle: () => <div />,
}));

import EditorPanel from "@/components/EditorPanel";

const baseProps = {
    files: [
        { id: 1, name: "main.py", content: "print('hi')" },
        { id: 2, name: "utils.py", content: "# utils" },
    ],
    activeFileId: 1,
    activeFile: { id: 1, name: "main.py", content: "print('hi')" },
    openFileIds: [1, 2],
    unsavedChanges: {} as Record<number, string>,
    isSignedIn: false,
    onTabClick: vi.fn(),
    onTabClose: vi.fn(),
    onEditorChange: vi.fn(),
    onQuickSave: vi.fn(),
};

describe("EditorPanel", () => {
    it("renders file tabs for open files", () => {
        render(<EditorPanel {...baseProps} />);
        const tabs = screen.getAllByTestId("file-tab");
        expect(tabs).toHaveLength(2);
        expect(tabs[0]).toHaveTextContent("main.py");
        expect(tabs[1]).toHaveTextContent("utils.py");
    });

    it("marks the active tab", () => {
        render(<EditorPanel {...baseProps} />);
        const tabs = screen.getAllByTestId("file-tab");
        expect(tabs[0].dataset.active).toBe("true");
        expect(tabs[1].dataset.active).toBeUndefined();
    });

    it("shows unsaved indicator on modified files", () => {
        render(<EditorPanel {...baseProps} unsavedChanges={{ 1: "modified" }} />);
        const tabs = screen.getAllByTestId("file-tab");
        expect(tabs[0]).toHaveTextContent("•");
    });

    it("shows 'No files open' when openFileIds is empty", () => {
        render(<EditorPanel {...baseProps} openFileIds={[]} />);
        expect(screen.getByText("No files open")).toBeInTheDocument();
    });

    it("renders Monaco editor when a file is active", () => {
        render(<EditorPanel {...baseProps} />);
        expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
    });

    it("shows placeholder when no file is active", () => {
        render(<EditorPanel {...baseProps} activeFileId={null} />);
        expect(screen.getByText("Select a file to edit")).toBeInTheDocument();
    });

    it("calls onTabClick when clicking an inactive tab", () => {
        const onTabClick = vi.fn();
        render(<EditorPanel {...baseProps} onTabClick={onTabClick} />);
        const tabs = screen.getAllByTestId("file-tab");
        fireEvent.click(tabs[1]); // click the inactive tab (utils.py)
        expect(onTabClick).toHaveBeenCalledWith(2);
    });

    it("does not call onTabClick when clicking the active tab", () => {
        const onTabClick = vi.fn();
        render(<EditorPanel {...baseProps} onTabClick={onTabClick} />);
        const tabs = screen.getAllByTestId("file-tab");
        fireEvent.click(tabs[0]); // click the already-active tab (main.py)
        expect(onTabClick).not.toHaveBeenCalled();
    });
});
