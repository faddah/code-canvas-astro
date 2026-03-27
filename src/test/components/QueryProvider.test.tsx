import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { QueryProvider } from "@/components/QueryProvider";

function QueryClientInspector() {
  const client = useQueryClient();
  const defaults = client.getDefaultOptions();
  return (
    <div>
      <span data-testid="refetch">{String(defaults.queries?.refetchOnWindowFocus)}</span>
      <span data-testid="stale">{String(defaults.queries?.staleTime)}</span>
      <span data-testid="retry">{String(defaults.queries?.retry)}</span>
      <span>Children rendered</span>
    </div>
  );
}

describe("QueryProvider", () => {
  it("renders children", () => {
    render(
      <QueryProvider>
        <div>Hello from child</div>
      </QueryProvider>
    );
    expect(screen.getByText("Hello from child")).toBeInTheDocument();
  });

  it("provides a QueryClient with correct defaults", () => {
    render(
      <QueryProvider>
        <QueryClientInspector />
      </QueryProvider>
    );
    expect(screen.getByTestId("refetch").textContent).toBe("false");
    expect(screen.getByTestId("stale").textContent).toBe("10000");
    expect(screen.getByTestId("retry").textContent).toBe("3");
  });
});
