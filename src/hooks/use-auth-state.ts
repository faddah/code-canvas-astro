import { useAuth } from "@clerk/astro/react";
import { useClerkUser } from "@/hooks/use-clerk-user";

export function useAuthState() {
    const { userId, signOut } = useAuth();
    const clerkUser = useClerkUser();

    return {
        isSignedIn: !!userId,
        userId,
        user: clerkUser ?? null,
        signOut,
    };
}