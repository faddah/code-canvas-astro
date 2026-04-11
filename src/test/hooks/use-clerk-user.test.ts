import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const mockStore = vi.hoisted(() => {
    let currentValue: any = null;
    const listeners = new Set<() => void>();
    return {
        get: vi.fn(() => currentValue),
        listen: vi.fn((cb: () => void) => {
        listeners.add(cb);
        return () => listeners.delete(cb);
        }),
        _set(val: any) {
        currentValue = val;
        listeners.forEach((cb) => cb());
        },
        _reset() {
        currentValue = null;
        listeners.clear();
        },
    };
});

vi.mock("@clerk/astro/client", () => ({
    $userStore: mockStore,
}));

import { useClerkUser } from "@/hooks/use-clerk-user";

describe("useClerkUser", () => {
    it("returns null when no user is signed in", () => {
        mockStore._reset();
        const { result } = renderHook(() => useClerkUser());
        expect(result.current).toBeNull();
    });

    it("returns user object when signed in", () => {
        mockStore._reset();
        const fakeUser = { id: "user_123", firstName: "Ada" };
        mockStore._set(fakeUser);
        mockStore.get.mockReturnValue(fakeUser);

        const { result } = renderHook(() => useClerkUser());
        expect(result.current).toEqual(
        expect.objectContaining({ id: "user_123", firstName: "Ada" }),
        );
    });

    it("subscribes via $userStore.listen", () => {
        mockStore._reset();
        renderHook(() => useClerkUser());
        expect(mockStore.listen).toHaveBeenCalled();
    });
});
