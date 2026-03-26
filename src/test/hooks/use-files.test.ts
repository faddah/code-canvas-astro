import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useUserFiles,
  useCreateUserFile,
  useUpdateUserFile,
  useDeleteUserFile,
  useStarterFiles,
} from "@/hooks/use-files";

// Mock use-toast
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
    dismiss: vi.fn(),
    toasts: [],
  }),
}));

// Test wrapper with fresh QueryClient per test
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── useUserFiles ───

describe("useUserFiles", () => {
  it("fetches user files when userId is provided", async () => {
    const mockFiles = [
      { id: 1, clerkUserId: "user_a", name: "a.py", content: "# a" },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFiles),
    });

    const { result } = renderHook(() => useUserFiles("user_a"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockFiles);
  });

  it("does not fetch when userId is null", () => {
    const { result } = renderHook(() => useUserFiles(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });

  it("does not fetch when userId is undefined", () => {
    const { result } = renderHook(() => useUserFiles(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });
});

// ─── useCreateUserFile ───

describe("useCreateUserFile", () => {
  it("sends POST request with file data", async () => {
    const newFile = { id: 1, name: "new.py", content: "# new", clerkUserId: "user_a" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(newFile),
    });

    const { result } = renderHook(() => useCreateUserFile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: "new.py", content: "# new" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/user-files/create",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "new.py", content: "# new" }),
      })
    );
  });

  it("handles server error", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const { result } = renderHook(() => useCreateUserFile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: "fail.py", content: "# fail" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ─── useUpdateUserFile ───

describe("useUpdateUserFile", () => {
  it("sends PUT request with updated content", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: "a.py", content: "# updated" }),
    });

    const { result } = renderHook(() => useUpdateUserFile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 1, content: "# updated" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/user-files/1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ content: "# updated" }),
      })
    );
  });
});

// ─── useDeleteUserFile ───

describe("useDeleteUserFile", () => {
  it("sends DELETE request for file id", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });

    const { result } = renderHook(() => useDeleteUserFile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(42);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith("/api/user-files/42", { method: "DELETE" });
  });

  it("handles delete failure with server error message", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Internal server error" }),
    });

    const { result } = renderHook(() => useDeleteUserFile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(99);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Internal server error");
  });
});

// ─── useStarterFiles ───

describe("useStarterFiles", () => {
  it("fetches starter files", async () => {
    const starters = [{ id: 1, name: "main.py", content: "# starter" }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(starters),
    });

    const { result } = renderHook(() => useStarterFiles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(starters);
  });
});
