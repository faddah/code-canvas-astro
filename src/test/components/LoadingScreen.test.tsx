import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoadingScreen } from "@/components/LoadingScreen";

describe("LoadingScreen", () => {
    it("renders the loading spinner and message", () => {
        render(<LoadingScreen />);
        expect(screen.getByText("Initializing Environment...")).toBeInTheDocument();
    });

    it("does not show retry button by default", () => {
        render(<LoadingScreen />);
        expect(
            screen.queryByText("Taking too long? Click to reload"),
        ).not.toBeInTheDocument();
    });

    it("shows retry button when showRetry is true", () => {
        render(<LoadingScreen showRetry={true} />);
        expect(
            screen.getByText("Taking too long? Click to reload"),
        ).toBeInTheDocument();
    });

    it("retry button calls window.location.reload", () => {
        const reloadMock = vi.fn();
        Object.defineProperty(window, "location", {
            value: { reload: reloadMock },
            writable: true,
        });

        render(<LoadingScreen showRetry={true} />);
        fireEvent.click(screen.getByText("Taking too long? Click to reload"));
        expect(reloadMock).toHaveBeenCalledOnce();
    });
});
