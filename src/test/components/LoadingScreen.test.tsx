import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { axeCheck } from "@/test/helpers/a11y";

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
    
    it("has no axe a11y violations in default state", async () => {
        const { container } = render(<LoadingScreen />);
        expect(await axeCheck(container)).toHaveNoViolations();
    });

    it("has no axe a11y violations with retry button shown", async () => {
        const { container } = render(<LoadingScreen showRetry={true} />);
        expect(await axeCheck(container)).toHaveNoViolations();
    });

    it("exposes the loading message as a status live region", () => {
        render(<LoadingScreen />);
        const status = screen.getByRole("status");
        expect(status).toHaveTextContent(/initializing environment/i);
    });

    it("marks the decorative spinner icon as aria-hidden", () => {
        const { container } = render(<LoadingScreen />);
        const icon = container.querySelector("svg");
        expect(icon).toHaveAttribute("aria-hidden", "true");
    });
});
