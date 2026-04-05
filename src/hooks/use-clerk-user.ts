import { useSyncExternalStore } from "react";
import { $userStore } from "@clerk/astro/client";
import type { UserResource } from "@clerk/shared/types";

export function useClerkUser(): UserResource | null | undefined {
    const get: () => UserResource | null | undefined = $userStore.get.bind($userStore);
    return useSyncExternalStore($userStore.listen, get, () => null);
}