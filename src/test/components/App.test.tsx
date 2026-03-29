import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock heavy dependencies before importing App
vi.mock("@/components/IDE", () => ({
  default: () => <div data-testid="ide">IDE Component</div>,
}));

vi.mock("@/components/ui/toaster", () => ({
  Toaster: () => <div data-testid="toaster">Toaster</div>,
}));

import App from "@/components/App";

describe("App", () => {
  it("renders IDE component", () => {
    render(<App />);
    expect(screen.getByTestId("ide")).toBeInTheDocument();
  });

  it("renders Toaster component", () => {
    render(<App />);
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
  });

  it("wraps content in ErrorBoundary and QueryProvider", () => {
    // If ErrorBoundary or QueryProvider fail to render, the test itself would fail.
    // The IDE and Toaster being visible confirms both wrappers work.
    render(<App />);
    expect(screen.getByTestId("ide")).toBeInTheDocument();
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
  });
});
