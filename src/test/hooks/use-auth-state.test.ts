import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuthState } from "@/hooks/use-auth-state";

const mockSignOut = vi.fn();
let mockUserId: string | null = null;
let mockClerkUser: any = null;

vi.mock("@clerk/astro/react", () => ({
    useAuth: () => ({ userId: mockUserId, signOut: mockSignOut }),
}));

vi.mock("@/hooks/use-clerk-user", () => ({
    useClerkUser: () => mockClerkUser,
}));

describe("useAuthState", () => {
    beforeEach(() => {
        mockUserId = null;
        mockClerkUser = null;
        mockSignOut.mockReset();
    });

    it("returns isSignedIn: false when userId is null", () => {
        const { result } = renderHook(() => useAuthState());
        expect(result.current.isSignedIn).toBe(false);
        expect(result.current.userId).toBeNull();
        expect(result.current.user).toBeNull();
    });

    it("returns isSignedIn: true when userId is present", () => {
        mockUserId = "user_abc123";
        mockClerkUser = {
            primaryEmailAddress: { emailAddress: "test@example.com" },
        };

        const { result } = renderHook(() => useAuthState());
        expect(result.current.isSignedIn).toBe(true);
        expect(result.current.userId).toBe("user_abc123");
        expect(result.current.user).toEqual(mockClerkUser);
    });

    it("returns user as null when clerkUser is undefined", () => {
        mockUserId = "user_abc123";
        mockClerkUser = undefined;

        const { result } = renderHook(() => useAuthState());
        expect(result.current.isSignedIn).toBe(true);
        expect(result.current.user).toBeNull();
    });

    it("exposes the signOut function", () => {
        const { result } = renderHook(() => useAuthState());
        expect(result.current.signOut).toBe(mockSignOut);
    });
});