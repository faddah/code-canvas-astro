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
  useFiles,
  useFile,
  useCreateFile,
  useUpdateFile,
  useDeleteFile,
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

// ─── useUpdateUserFile with projectId ───

describe("useUpdateUserFile with projectId", () => {
  it("sends PUT request with projectId in body", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: "a.py", content: "# code", projectId: 5 }),
    });

    const { result } = renderHook(() => useUpdateUserFile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 1, content: "# code", projectId: 5 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/user-files/1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ content: "# code", projectId: 5 }),
      })
    );
  });

  it("sends PUT request with null projectId to unassign from project", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: "a.py", content: "# code", projectId: null }),
    });

    const { result } = renderHook(() => useUpdateUserFile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 1, projectId: null });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/user-files/1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ projectId: null }),
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

// ─── useUserFiles (error path — hook has retry:5 with exponential backoff,
//     so we skip testing the final isError state to avoid slow tests.
//     The queryFn throw path is identical to useStarterFiles which IS tested.) ───

// ─── useUpdateUserFile (error path) ───

describe("useUpdateUserFile error handling", () => {
  it("handles server error on update", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const { result } = renderHook(() => useUpdateUserFile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 1, content: "# fail" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ─── useDeleteUserFile (non-JSON error body) ───

describe("useDeleteUserFile edge cases", () => {
  it("falls back to HTTP status when error body is not JSON", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.reject(new Error("not JSON")),
    });

    const { result } = renderHook(() => useDeleteUserFile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(42);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("HTTP 503");
  });

  it("uses message field when error field is absent", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: "File not found" }),
    });

    const { result } = renderHook(() => useDeleteUserFile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(42);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("File not found");
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

  it("throws on fetch failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const { result } = renderHook(() => useStarterFiles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ═══════════════════════════════════════════════════════════════
// Legacy hooks (backward compat — delegate to starter files)
// ═══════════════════════════════════════════════════════════════

// ─── useFiles ───

describe("useFiles", () => {
  it("fetches files from legacy endpoint", async () => {
    const mockFiles = [
      { id: 1, name: "main.py", content: "print('hello')" },
      { id: 2, name: "utils.py", content: "# utils" },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFiles),
    });

    const { result } = renderHook(() => useFiles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockFiles);
    expect(global.fetch).toHaveBeenCalledWith("/api/files");
  });

  it("throws on fetch failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const { result } = renderHook(() => useFiles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ─── useFile ───

describe("useFile", () => {
  it("fetches a single file by id", async () => {
    const mockFile = { id: 5, name: "script.py", content: "# script" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFile),
    });

    const { result } = renderHook(() => useFile(5), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockFile);
    expect(global.fetch).toHaveBeenCalledWith("/api/files/5");
  });

  it("does not fetch when id is null", () => {
    const { result } = renderHook(() => useFile(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });

  it("returns null on 404 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => useFile(999), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("throws on non-404 error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useFile(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ─── useCreateFile ───

describe("useCreateFile", () => {
  it("sends POST request to legacy create endpoint", async () => {
    const newFile = { id: 3, name: "new.py", content: "# new file" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(newFile),
    });

    const { result } = renderHook(() => useCreateFile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: "new.py", content: "# new file" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/files/create",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "new.py", content: "# new file" }),
      })
    );
  });

  it("handles server error on create", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const { result } = renderHook(() => useCreateFile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: "fail.py", content: "# fail" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ─── useUpdateFile ───

describe("useUpdateFile", () => {
  it("sends PUT request to legacy update endpoint", async () => {
    const updated = { id: 1, name: "main.py", content: "# updated" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(updated),
    });

    const { result } = renderHook(() => useUpdateFile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 1, content: "# updated" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/files/1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ content: "# updated" }),
      })
    );
  });

  it("handles server error on update", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const { result } = renderHook(() => useUpdateFile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 1, content: "# fail" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ─── useDeleteFile ───

describe("useDeleteFile", () => {
  it("sends DELETE request to legacy delete endpoint", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });

    const { result } = renderHook(() => useDeleteFile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(10);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith("/api/files/10", { method: "DELETE" });
  });

  it("handles delete failure with JSON error body", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    const { result } = renderHook(() => useDeleteFile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(10);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Server error");
  });

  it("handles delete failure with message field in error body", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: "File not found" }),
    });

    const { result } = renderHook(() => useDeleteFile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(999);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("File not found");
  });

  it("falls back to HTTP status when error body is not JSON", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.reject(new Error("not JSON")),
    });

    const { result } = renderHook(() => useDeleteFile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(10);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("HTTP 503");
  });
});
