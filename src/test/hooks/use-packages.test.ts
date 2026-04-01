import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach
} from "vitest";
import {
    renderHook,
    waitFor,
    act
} from "@testing-library/react";
import React from "react";
import {
    QueryClient,
    QueryClientProvider
} from "@tanstack/react-query";
import {
    usePackages,
    useAddPackage,
    useRemovePackage,
} from "@/hooks/use-packages";

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

describe("use-packages hooks", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ─── usePackages ───

    describe("usePackages", () => {
        it("fetches all packages when userId is provided", async () => {
            const mockPackages = [
                {
                    id: 1,
                    clerkUserId: "user_a",
                    projectId: null,
                    packageName: "numpy",
                    versionSpec: null,
                    createdAt: new Date()
                },
            ];
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockPackages),
            });

            const { result } = renderHook(() => usePackages("user_a"), {
                wrapper: createWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(result.current.data).toEqual(mockPackages);
            expect(global.fetch).toHaveBeenCalledWith("/api/packages");
        });

        it("appends projectId query param when provided", async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([]),
            });

            const { result } = renderHook(() => usePackages("user_a", 5), {
                wrapper: createWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(global.fetch).toHaveBeenCalledWith("/api/packages?projectId=5");
        });

        it("sends empty projectId param for null (unassigned packages)", async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([]),
            });

            const { result } = renderHook(() => usePackages("user_a", null), {
                wrapper: createWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(global.fetch).toHaveBeenCalledWith("/api/packages?projectId=");
        });

        it("does not fetch when userId is null", () => {
            const { result } = renderHook(() => usePackages(null), {
                wrapper: createWrapper(),
            });

            expect(result.current.fetchStatus).toBe("idle");
        });

        it("does not fetch when userId is undefined", () => {
            const { result } = renderHook(() => usePackages(undefined), {
                wrapper: createWrapper(),
            });

            expect(result.current.fetchStatus).toBe("idle");
        });

        it("handles fetch error", async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

            const { result } = renderHook(() => usePackages("user_a"), {
                wrapper: createWrapper(),
            });

            await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 35000 });
        }, 40000);
    });

    // ─── useAddPackage ───

    describe("useAddPackage", () => {
        it("sends POST request with package data", async () => {
            const newPkg = {
                id: 1,
                clerkUserId: "user_a",
                packageName: "numpy",
                projectId: null,
                versionSpec: null,
                createdAt: new Date()
            };
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(newPkg),
            });

            const { result } = renderHook(() => useAddPackage(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                result.current.mutate({ packageName: "numpy" });
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/packages/create",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({ packageName: "numpy" }),
                })
            );
        });

        it("includes projectId and versionSpec when provided", async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    id: 2,
                    packageName: "pandas",
                    projectId: 3,
                    versionSpec: ">=1.5"
                }),
            });

            const { result } = renderHook(() => useAddPackage(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                result.current.mutate({ packageName: "pandas", projectId: 3, versionSpec: ">=1.5" });
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/packages/create",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({ packageName: "pandas", projectId: 3, versionSpec: ">=1.5" }),
                })
            );
        });

        it("handles server error", async () => {
            global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400 });

            const { result } = renderHook(() => useAddPackage(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                result.current.mutate({ packageName: "badpkg" });
            });

            await waitFor(() => expect(result.current.isError).toBe(true));
        });
    });

    // ─── useRemovePackage ───

    describe("useRemovePackage", () => {
        it("sends DELETE request for package id", async () => {
            global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });

            const { result } = renderHook(() => useRemovePackage(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                result.current.mutate(7);
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(global.fetch).toHaveBeenCalledWith("/api/packages/7", { method: "DELETE" });
        });

        it("handles delete failure with server error message", async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: () => Promise.resolve({ error: "Package not found" }),
            });

            const { result } = renderHook(() => useRemovePackage(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                result.current.mutate(99);
            });

            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error?.message).toBe("Package not found");
        });

        it("handles non-JSON error response", async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                json: () => Promise.reject(new Error("not JSON")),
            });

            const { result } = renderHook(() => useRemovePackage(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                result.current.mutate(99);
            });

            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error?.message).toBe("HTTP 500");
        });
    });
});
