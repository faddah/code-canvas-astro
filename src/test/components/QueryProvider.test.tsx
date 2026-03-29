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

  it("retryDelay uses exponential backoff capped at 8000ms", () => {
    let retryDelayFn: ((attempt: number) => number) | undefined;

    function RetryDelayExtractor() {
      const client = useQueryClient();
      const defaults = client.getDefaultOptions();
      retryDelayFn = defaults.queries?.retryDelay as (attempt: number) => number;
      return null;
    }

    render(
      <QueryProvider>
        <RetryDelayExtractor />
      </QueryProvider>
    );

    expect(retryDelayFn).toBeDefined();
    // attempt 0: min(1000 * 2^0, 8000) = 1000
    expect(retryDelayFn!(0)).toBe(1000);
    // attempt 1: min(1000 * 2^1, 8000) = 2000
    expect(retryDelayFn!(1)).toBe(2000);
    // attempt 2: min(1000 * 2^2, 8000) = 4000
    expect(retryDelayFn!(2)).toBe(4000);
    // attempt 3: min(1000 * 2^3, 8000) = 8000
    expect(retryDelayFn!(3)).toBe(8000);
    // attempt 4: min(1000 * 2^4, 8000) = 8000 (capped)
    expect(retryDelayFn!(4)).toBe(8000);
  });
});
