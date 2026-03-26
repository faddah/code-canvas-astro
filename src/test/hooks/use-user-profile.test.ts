import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useUserProfile,
  useCreateUserProfile,
  useUpdateUserProfile,
  useDeleteUserProfile,
} from "@/hooks/use-user-profile";

// Mock use-toast
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

// ─── useUserProfile ───

describe("useUserProfile", () => {
  it("fetches profile when enabled", async () => {
    const mockProfile = {
      id: 1,
      clerkUserId: "user_abc",
      city: "Portland",
      state: "OR",
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockProfile),
    });

    const { result } = renderHook(() => useUserProfile(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProfile);
  });

  it("returns null when profile is 404", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => useUserProfile(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("does not fetch when disabled", () => {
    const { result } = renderHook(() => useUserProfile(false), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });
});

// ─── useCreateUserProfile ───

describe("useCreateUserProfile", () => {
  it("sends POST with profile data", async () => {
    const profileData = {
      phone: "503-555-1234",
      city: "Portland",
      state: "OR",
      postalCode: "97201",
      country: "US",
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, clerkUserId: "user_abc", ...profileData }),
    });

    const { result } = renderHook(() => useCreateUserProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(profileData);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/user-profile",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(profileData),
      })
    );
  });
});

// ─── useUpdateUserProfile ───

describe("useUpdateUserProfile", () => {
  it("sends PUT with updated fields", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, clerkUserId: "user_abc", city: "Seattle" }),
    });

    const { result } = renderHook(() => useUpdateUserProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ city: "Seattle" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/user-profile",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ city: "Seattle" }),
      })
    );
  });
});

// ─── useDeleteUserProfile ───

describe("useDeleteUserProfile", () => {
  it("sends DELETE request", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    const { result } = renderHook(() => useDeleteUserProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith("/api/user-profile", { method: "DELETE" });
  });

  it("handles delete failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: "Server error" }),
    });

    const { result } = renderHook(() => useDeleteUserProfile(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Server error");
  });
});
