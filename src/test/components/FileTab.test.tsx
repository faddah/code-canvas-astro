import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileTab } from "@/components/FileTab";

describe("FileTab", () => {
  it("renders the file name", () => {
    render(
      <FileTab name="main.py" isActive={false} onClick={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.getByText("main.py")).toBeInTheDocument();
  });

  it("applies active styles when isActive is true", () => {
    const { container } = render(
      <FileTab name="main.py" isActive={true} onClick={vi.fn()} onClose={vi.fn()} />
    );
    const tab = container.firstChild as HTMLElement;
    expect(tab.className).toContain("bg-background");
    expect(tab.className).toContain("border-t-primary");
  });

  it("applies inactive styles when isActive is false", () => {
    const { container } = render(
      <FileTab name="main.py" isActive={false} onClick={vi.fn()} onClose={vi.fn()} />
    );
    const tab = container.firstChild as HTMLElement;
    expect(tab.className).toContain("bg-muted/30");
    expect(tab.className).toContain("border-t-transparent");
  });

  it("shows unsaved indicator when isUnsaved is true", () => {
    const { container } = render(
      <FileTab name="main.py" isActive={false} isUnsaved={true} onClick={vi.fn()} onClose={vi.fn()} />
    );
    const dot = container.querySelector(".bg-white\\/50");
    expect(dot).toBeInTheDocument();
  });

  it("does not show unsaved indicator when isUnsaved is false", () => {
    const { container } = render(
      <FileTab name="main.py" isActive={false} isUnsaved={false} onClick={vi.fn()} onClose={vi.fn()} />
    );
    const dot = container.querySelector(".bg-white\\/50");
    expect(dot).not.toBeInTheDocument();
  });

  it("calls onClick when tab is clicked", () => {
    const onClick = vi.fn();
    render(
      <FileTab name="main.py" isActive={false} onClick={onClick} onClose={vi.fn()} />
    );
    fireEvent.click(screen.getByText("main.py"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <FileTab name="main.py" isActive={true} onClick={vi.fn()} onClose={onClose} />
    );
    const closeBtn = container.querySelector("button");
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders python emoji icon", () => {
    render(
      <FileTab name="test.py" isActive={false} onClick={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.getByText("🐍")).toBeInTheDocument();
  });
});
