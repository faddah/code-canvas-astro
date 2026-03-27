import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useMoveFileToProject,
} from "@/hooks/use-projects";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
    dismiss: vi.fn(),
    toasts: [],
  }),
}));

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

// ─── useProjects ───

describe("useProjects", () => {
  it("fetches projects when userId is provided", async () => {
    const mockProjects = [
      { id: 1, clerkUserId: "user_a", name: "My Project", description: null, createdAt: new Date(), updatedAt: new Date() },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProjects),
    });

    const { result } = renderHook(() => useProjects("user_a"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProjects);
  });

  it("does not fetch when userId is null", () => {
    const { result } = renderHook(() => useProjects(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });

  it("does not fetch when userId is undefined", () => {
    const { result } = renderHook(() => useProjects(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles fetch error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useProjects("user_a"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ─── useCreateProject ───

describe("useCreateProject", () => {
  it("sends POST request with project data", async () => {
    const newProject = { id: 1, name: "Test Project", clerkUserId: "user_a" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(newProject),
    });

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: "Test Project" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/projects/create",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Test Project" }),
      })
    );
  });

  it("handles server error", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: "Fail Project" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ─── useUpdateProject ───

describe("useUpdateProject", () => {
  it("sends PUT request with updated data", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: "Updated" }),
    });

    const { result } = renderHook(() => useUpdateProject(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 1, name: "Updated" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/projects/1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      })
    );
  });

  it("handles update error", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const { result } = renderHook(() => useUpdateProject(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 1, name: "Fail" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ─── useDeleteProject ───

describe("useDeleteProject", () => {
  it("sends DELETE request for project id", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(5);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith("/api/projects/5", { method: "DELETE" });
  });

  it("handles delete failure with server error message", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "Project not found" }),
    });

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(99);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Project not found");
  });

  it("handles non-JSON error response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not JSON")),
    });

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(99);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("HTTP 500");
  });
});

// ─── useMoveFileToProject ───

describe("useMoveFileToProject", () => {
  it("sends PUT request to update file projectId", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, projectId: 5 }),
    });

    const { result } = renderHook(() => useMoveFileToProject(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ fileId: 1, projectId: 5 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/user-files/1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ projectId: 5 }),
      })
    );
  });

  it("can move file out of project (null projectId)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, projectId: null }),
    });

    const { result } = renderHook(() => useMoveFileToProject(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ fileId: 1, projectId: null });
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

  it("handles move error", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const { result } = renderHook(() => useMoveFileToProject(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ fileId: 1, projectId: 5 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
