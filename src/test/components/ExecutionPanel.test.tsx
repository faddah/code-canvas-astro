import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock Resizable panels
vi.mock("@/components/ui/resizable", () => ({
    ResizablePanelGroup: ({ children }: any) => <div>{children}</div>,
    ResizablePanel: ({ children }: any) => <div>{children}</div>,
    ResizableHandle: () => <div />,
}));

// Mock child components — capture props for verification
const mockWebPreview = vi.fn(({ htmlContent }: any) => (
    <div data-testid="web-preview">{htmlContent}</div>
));
vi.mock("@/components/WebPreview", () => ({
    WebPreview: (props: any) => mockWebPreview(props),
}));

const mockConsolePanel = vi.fn(({ logs }: any) => (
    <div data-testid="console-panel">{logs.join(",")}</div>
));
vi.mock("@/components/ConsolePanel", () => ({
    ConsolePanel: (props: any) => mockConsolePanel(props),
}));

import ExecutionPanel from "@/components/ExecutionPanel";

const baseProps = {
    htmlOutput: "<h1>Hello</h1>",
    logs: ["line 1", "line 2"],
    onClear: vi.fn(),
    isWaitingForInput: false,
    onSubmitInput: vi.fn(),
};

describe("ExecutionPanel", () => {
    it("renders WebPreview and ConsolePanel", () => {
        render(<ExecutionPanel {...baseProps} />);
        expect(screen.getByTestId("web-preview")).toBeInTheDocument();
        expect(screen.getByTestId("console-panel")).toBeInTheDocument();
    });

    it("passes htmlOutput to WebPreview", () => {
        render(<ExecutionPanel {...baseProps} />);
        expect(mockWebPreview).toHaveBeenCalledWith(
        expect.objectContaining({ htmlContent: "<h1>Hello</h1>" }),
        );
    });

    it("passes logs and onClear to ConsolePanel", () => {
        render(<ExecutionPanel {...baseProps} />);
        expect(mockConsolePanel).toHaveBeenCalledWith(
        expect.objectContaining({
            logs: ["line 1", "line 2"],
            onClear: baseProps.onClear,
        }),
        );
    });

    it("passes input-related props to ConsolePanel", () => {
        render(<ExecutionPanel {...baseProps} isWaitingForInput={true} />);
        expect(mockConsolePanel).toHaveBeenCalledWith(
        expect.objectContaining({
            isWaitingForInput: true,
            onSubmitInput: baseProps.onSubmitInput,
        }),
        );
    });
});
