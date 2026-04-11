import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { reducer, useToast, toast } from "@/hooks/use-toast";

// ─── reducer (pure function) ───

describe("use-toast reducer", () => {
    const emptyState = { toasts: [] };

    it("ADD_TOAST adds a toast", () => {
        const newToast = { id: "1", title: "Hello", open: true } as any;
        const result = reducer(emptyState, {
        type: "ADD_TOAST",
        toast: newToast,
        });
        expect(result.toasts).toHaveLength(1);
        expect(result.toasts[0].title).toBe("Hello");
    });

    it("ADD_TOAST enforces TOAST_LIMIT of 1", () => {
        const first = { id: "1", title: "First", open: true } as any;
        const second = { id: "2", title: "Second", open: true } as any;
        const stateWithOne = reducer(emptyState, {
        type: "ADD_TOAST",
        toast: first,
        });
        const result = reducer(stateWithOne, {
        type: "ADD_TOAST",
        toast: second,
        });
        expect(result.toasts).toHaveLength(1);
        expect(result.toasts[0].title).toBe("Second");
    });

    it("UPDATE_TOAST updates matching toast", () => {
        const state = {
        toasts: [{ id: "1", title: "Old", open: true } as any],
        };
        const result = reducer(state, {
        type: "UPDATE_TOAST",
        toast: { id: "1", title: "New" },
        });
        expect(result.toasts[0].title).toBe("New");
        expect(result.toasts[0].open).toBe(true);
    });

    it("DISMISS_TOAST sets open to false for matching toast", () => {
        const state = {
        toasts: [{ id: "1", title: "Hello", open: true } as any],
        };
        const result = reducer(state, {
        type: "DISMISS_TOAST",
        toastId: "1",
        });
        expect(result.toasts[0].open).toBe(false);
    });

    it("DISMISS_TOAST with no id dismisses all toasts", () => {
        const state = {
        toasts: [{ id: "1", open: true } as any, { id: "2", open: true } as any],
        };
        const result = reducer(state, { type: "DISMISS_TOAST" });
        expect(result.toasts.every((t: any) => t.open === false)).toBe(true);
    });

    it("REMOVE_TOAST removes matching toast", () => {
        const state = {
        toasts: [{ id: "1", title: "Hello", open: true } as any],
        };
        const result = reducer(state, {
        type: "REMOVE_TOAST",
        toastId: "1",
        });
        expect(result.toasts).toHaveLength(0);
    });

    it("REMOVE_TOAST with no id clears all toasts", () => {
        const state = {
        toasts: [{ id: "1", open: true } as any, { id: "2", open: true } as any],
        };
        const result = reducer(state, { type: "REMOVE_TOAST" });
        expect(result.toasts).toHaveLength(0);
    });
    });

    // ─── toast() and useToast() ───

    describe("toast() and useToast()", () => {
    beforeEach(() => {
        // Dismiss and remove any leftover toasts from previous tests
        const { result } = renderHook(() => useToast());
        act(() => {
        result.current.toasts.forEach((t) => result.current.dismiss(t.id));
        });
    });

    it("toast() adds a toast visible via useToast()", () => {
        const { result } = renderHook(() => useToast());

        act(() => {
        toast({ title: "Test toast" });
        });

        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].title).toBe("Test toast");
        expect(result.current.toasts[0].open).toBe(true);
    });

    it("toast() returns id and dismiss function", () => {
        const { result } = renderHook(() => useToast());

        let returned: any;
        act(() => {
        returned = toast({ title: "Dismissable" });
        });

        expect(returned.id).toBeDefined();
        expect(typeof returned.dismiss).toBe("function");

        act(() => {
        returned.dismiss();
        });

        expect(result.current.toasts[0].open).toBe(false);
    });

    it("useToast dismiss() dismisses by id", () => {
        const { result } = renderHook(() => useToast());

        let toastId: string;
        act(() => {
        toastId = toast({ title: "To dismiss" }).id;
        });

        act(() => {
        result.current.dismiss(toastId);
        });

        expect(result.current.toasts[0].open).toBe(false);
    });
});
