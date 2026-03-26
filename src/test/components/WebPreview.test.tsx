import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WebPreview } from "@/components/WebPreview";

describe("WebPreview", () => {
  it("shows empty state when no HTML content", () => {
    render(<WebPreview htmlContent={null} />);
    expect(screen.getByText("No Output to Render")).toBeInTheDocument();
    expect(screen.getByText(/render\(/)).toBeInTheDocument();
  });

  it("renders HTML content via dangerouslySetInnerHTML", () => {
    render(<WebPreview htmlContent="<h1>Hello World</h1>" />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
    expect(screen.queryByText("No Output to Render")).not.toBeInTheDocument();
  });

  it("shows Web Preview header", () => {
    render(<WebPreview htmlContent={null} />);
    expect(screen.getByText("Web Preview")).toBeInTheDocument();
  });

  it("renders complex HTML content", () => {
    render(
      <WebPreview htmlContent='<p>Line 1</p><p>Line 2</p><strong>Bold</strong>' />
    );
    expect(screen.getByText("Line 1")).toBeInTheDocument();
    expect(screen.getByText("Line 2")).toBeInTheDocument();
    expect(screen.getByText("Bold")).toBeInTheDocument();
  });
});
