import { useState, useEffect } from "react";

export function useLoadingStateCleanup(isLoading: boolean) {
    const [loadingTooLong, setLoadingTooLong] = useState(false);

    // Remove the static loading placeholder once React has mounted
    useEffect(() => {
        const el = document.getElementById("app-loading");
        if (el) el.remove();
    }, []);

    // Track how long we've been loading — show a retry hint after 10 seconds
    useEffect(() => {
        if (!isLoading) {
            setLoadingTooLong(false);
            return;
        }
        const timer = setTimeout(() => setLoadingTooLong(true), 10_000);
        return () => clearTimeout(timer);
    }, [isLoading]);

    return { loadingTooLong };
}
