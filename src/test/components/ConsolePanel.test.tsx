import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConsolePanel } from "@/components/ConsolePanel";

describe("ConsolePanel", () => {
  it("shows placeholder when no logs and not waiting for input", () => {
    render(<ConsolePanel logs={[]} onClear={vi.fn()} />);
    expect(screen.getByText(/Ready to execute/)).toBeInTheDocument();
  });

  it("renders log entries", () => {
    render(
      <ConsolePanel
        logs={["Hello, world!", "Second line"]}
        onClear={vi.fn()}
      />
    );
    expect(screen.getByText("Hello, world!")).toBeInTheDocument();
    expect(screen.getByText("Second line")).toBeInTheDocument();
  });

  it("renders error logs with red styling", () => {
    render(
      <ConsolePanel logs={["[Error] Something broke"]} onClear={vi.fn()} />
    );
    const errorLine = screen.getByText("[Error] Something broke");
    expect(errorLine).toBeInTheDocument();
    expect(errorLine.className).toContain("text-red-400");
  });

  it("calls onClear when clear button is clicked", async () => {
    const onClear = vi.fn();
    render(<ConsolePanel logs={["some log"]} onClear={onClear} />);

    const clearBtn = screen.getByTitle("Clear Console");
    await userEvent.click(clearBtn);

    expect(onClear).toHaveBeenCalledOnce();
  });

  // ─── Inline Console Input (Chrome/JSPI path) ───

  it("shows inline >>> input field when waiting for input — Chrome/JSPI path", () => {
    render(
      <ConsolePanel
        logs={["Enter your name:"]}
        onClear={vi.fn()}
        isWaitingForInput={true}
        onSubmitInput={vi.fn()}
      />
    );
    expect(
      screen.getByPlaceholderText("Type your input and press Enter...")
    ).toBeInTheDocument();
    expect(screen.getByText(">>>")).toBeInTheDocument();
  });

  it("does not show input field when not waiting for input", () => {
    render(<ConsolePanel logs={["output"]} onClear={vi.fn()} />);
    expect(
      screen.queryByPlaceholderText("Type your input and press Enter...")
    ).not.toBeInTheDocument();
  });

  it("submits input on Enter key and clears the field — Chrome/JSPI path", async () => {
    const onSubmitInput = vi.fn();
    render(
      <ConsolePanel
        logs={[]}
        onClear={vi.fn()}
        isWaitingForInput={true}
        onSubmitInput={onSubmitInput}
      />
    );

    const input = screen.getByPlaceholderText(
      "Type your input and press Enter..."
    );
    await userEvent.type(input, "Alice{Enter}");

    expect(onSubmitInput).toHaveBeenCalledWith("Alice");
  });

  it("does not submit on non-Enter keys", async () => {
    const onSubmitInput = vi.fn();
    render(
      <ConsolePanel
        logs={[]}
        onClear={vi.fn()}
        isWaitingForInput={true}
        onSubmitInput={onSubmitInput}
      />
    );

    const input = screen.getByPlaceholderText(
      "Type your input and press Enter..."
    );
    await userEvent.type(input, "Alice");

    // onSubmitInput should NOT have been called (no Enter pressed)
    expect(onSubmitInput).not.toHaveBeenCalled();
  });
});
