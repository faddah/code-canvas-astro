import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLoadingStateCleanup } from "@/hooks/use-loading-state-cleanup";

describe("useLoadingStateCleanup", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("removes #app-loading element on mount", () => {
        const el = document.createElement("div");
        el.id = "app-loading";
        document.body.appendChild(el);

        expect(document.getElementById("app-loading")).not.toBeNull();
        renderHook(() => useLoadingStateCleanup(false));
        expect(document.getElementById("app-loading")).toBeNull();
    });

    it("returns loadingTooLong as false initially", () => {
        const { result } = renderHook(() => useLoadingStateCleanup(true));
        expect(result.current.loadingTooLong).toBe(false);
    });

    it("sets loadingTooLong to true after 10 seconds of loading", () => {
        const { result } = renderHook(() => useLoadingStateCleanup(true));
        expect(result.current.loadingTooLong).toBe(false);

        act(() => {
            vi.advanceTimersByTime(10_000);
        });

        expect(result.current.loadingTooLong).toBe(true);
    });

    it("does not set loadingTooLong if loading completes before 10 seconds", () => {
        const { result, rerender } = renderHook(
            ({ isLoading }) => useLoadingStateCleanup(isLoading),
            { initialProps: { isLoading: true } },
        );

        act(() => {
            vi.advanceTimersByTime(5_000);
        });
        expect(result.current.loadingTooLong).toBe(false);

        // Loading finishes
        rerender({ isLoading: false });
        expect(result.current.loadingTooLong).toBe(false);

        // Even after more time passes, stays false
        act(() => {
            vi.advanceTimersByTime(10_000);
        });
        expect(result.current.loadingTooLong).toBe(false);
    });

    it("resets loadingTooLong when loading stops", () => {
        const { result, rerender } = renderHook(
            ({ isLoading }) => useLoadingStateCleanup(isLoading),
            { initialProps: { isLoading: true } },
        );

        act(() => {
            vi.advanceTimersByTime(10_000);
        });
        expect(result.current.loadingTooLong).toBe(true);

        rerender({ isLoading: false });
        expect(result.current.loadingTooLong).toBe(false);
    });
});
