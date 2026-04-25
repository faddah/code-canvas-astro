import "@testing-library/jest-dom/vitest";
import "@/test/helpers/a11y";
import { vi, beforeEach, afterEach } from "vitest";

// Store original console methods so spies can delegate when needed
const originalConsoleError = console.error;

beforeEach(() => {
    // Silence console.log noise (hook debug messages like "[useUserFiles] Fetching...")
    vi.spyOn(console, "log").mockImplementation(() => {});

    // Silence Radix UI accessibility warnings that fire during tests
    // (AlertDialogContent/DialogContent description/title warnings)
    vi.spyOn(console, "warn").mockImplementation(() => {});

    // Silence expected console.error noise (Radix warnings, act() warnings, etc.)
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
        const msg = typeof args[0] === "string" ? args[0] : "";
        // Let through unexpected errors so real bugs are still visible
        if (
            msg.includes("AlertDialogContent") || 
            msg.includes("DialogContent") || 
            msg.includes("not wrapped in act(...)") || 
            msg.includes("The response body was not JSON") || 
            msg.includes("[useDeleteUserFile]") || 
            msg.includes("[useDeleteFile]") || 
            msg.includes("Failed to update password")
        ) {
            return; // suppress known test noise
        }
        originalConsoleError(...args);
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});
