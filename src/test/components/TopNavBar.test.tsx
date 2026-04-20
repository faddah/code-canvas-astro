import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TopNavBar , { type ClerkUser, type TopNavBarProps }from "@/components/TopNavBar";
import { version } from "../../../package.json";
import { axeCheck } from "@/test/helpers/a11y";

describe("TopNavBar", () => {
    const makeDefaults = (): TopNavBarProps => ({
        isSignedIn: false,
        isReady: false,
        isRunning: false,
        activeFileId: null,
        activeContent: null,
        unsavedChanges: {},
        user: null,
        onRun: vi.fn(),
        onQuickSave: vi.fn(),
        onSaveAsClick: vi.fn(),
        onImportClick: vi.fn(),
        onProfileClick: vi.fn(),
    });

    const renderTopNavBar = (overrides: Partial<TopNavBarProps> = {}) => {
        const props = { ...makeDefaults(), ...overrides };
        return { props, ...render(<TopNavBar {...props} />) };
    };

    it("disables Run button when environment is not ready", () => {
        renderTopNavBar({ isReady: false, activeFileId: 1 });
        expect(screen.getByRole("button", { name: /run/i })).toBeDisabled();
    });

    it("disables Run button while running", () => {
        renderTopNavBar({ isReady: true, isRunning: true, activeFileId: 1 });
        expect(screen.getByRole("button", { name: /run/i })).toBeDisabled();
    });

    it("disables Run button when there is no active file", () => {
        renderTopNavBar({ isReady: true, isRunning: false, activeFileId: null });
        expect(screen.getByRole("button", { name: /run/i })).toBeDisabled();
    });

    it("enables Run button when ready, idle, and a file is active", () => {
        renderTopNavBar({ isReady: true, isRunning: false, activeFileId: 1 });
        expect(screen.getByRole("button", { name: /run/i })).toBeEnabled();
    });

    it("calls onRun when the Run button is clicked", () => {
        const { props } = renderTopNavBar({ isReady: true, activeFileId: 1 });
        fireEvent.click(screen.getByRole("button", { name: /run/i }));
        expect(props.onRun).toHaveBeenCalledTimes(1);
    });

    it("renders the green 'Files cannot be saved...' banner when !isSignedIn", () => {
        renderTopNavBar({ isSignedIn: false });
        expect(screen.getByText(/Files cannot be saved/i)).toBeInTheDocument();
    });

    it("renders a 'Create An Account' button inside SignUpButton when !isSignedIn", () => {
        renderTopNavBar({ isSignedIn: false });
        expect(screen.getByRole("button", { name: /create an account/i })).toBeInTheDocument();
    });

    it("renders a 'Log In' button inside SignInButton when !isSignedIn", () => {
        renderTopNavBar({ isSignedIn: false });
        expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
    });

    it("Does not render Save, Save As, or Open / Import when !isSignedIn", () => {
        renderTopNavBar({ isSignedIn: false });
        expect(screen.queryByRole("button", { name: /^save$/i })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /save as/i })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /open \/ import/i })).not.toBeInTheDocument();
    });

    it("does not render the email/profile button or Log Out button when !isSignedIn", () => {
        renderTopNavBar({ isSignedIn: false });
        expect(screen.queryByRole("button", { name: /log out/i })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /profile/i })).not.toBeInTheDocument();
    });

    it("Renders Save, Save As, and Open / Import when isSignedIn", () => {
        renderTopNavBar({ isSignedIn: true });
        expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /save as/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /open \/ import/i })).toBeInTheDocument();
    });

    it("renders the user's email from user.primaryEmailAddress.emailAddress when isSignedIn", () => {
        const user: ClerkUser = {
            id: "user_123",
            primaryEmailAddress: { emailAddress: "test@example.com" },
        };
        renderTopNavBar({ isSignedIn: true, user });
        expect(screen.getByRole("button", { name: /test@example.com/i })).toBeInTheDocument();
    });

    it("does not render the green banner / Sign In / Sign Up buttons when isSignedIn", () => {
        renderTopNavBar({ isSignedIn: true });
        expect(screen.queryByText(/Files cannot be saved/i)).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /create an account/i })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /log in/i })).not.toBeInTheDocument();
    });

    it("disables the Save button when activeFileId is null", () => {
        renderTopNavBar({ isSignedIn: true, activeFileId: null });
        expect(screen.getByRole("button", { name: /^save$/i })).toBeDisabled();
    });

    it("enables the Save button when activeFileId is set", () => {
        renderTopNavBar({ isSignedIn: true, activeFileId: 1 });
        expect(screen.getByRole("button", { name: /^save$/i })).toBeEnabled();
    });

    it("it attaches the yellow-border class `border-yellow-500/50` to the Save button when unsavedChanges[activeFileId] is set", () => {
        renderTopNavBar({ isSignedIn: true, activeFileId: 1, unsavedChanges: { 1: "foo" } });
        expect(screen.getByRole("button", { name: /^save$/i })).toHaveClass("border-yellow-500/50");
    });

    it("calls onQuickSave exactly once when Save is clicked", () => {
        const { props } = renderTopNavBar({ isSignedIn: true, activeFileId: 1 });
        fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
        expect(props.onQuickSave).toHaveBeenCalledTimes(1);
    });

    it("calls onSaveAsClick exactly once when Save As is clicked", () => {
        const { props } = renderTopNavBar({ isSignedIn: true, activeFileId: 1 });
        fireEvent.click(screen.getByRole("button", { name: /save as/i }));
        expect(props.onSaveAsClick).toHaveBeenCalledTimes(1);
    });

    it("renders the Open / Import button when isSignedIn is true", () => {
        renderTopNavBar({ isSignedIn: true });
        expect(screen.getByRole("button", { name: /open \/ import/i })).toBeInTheDocument();
    });

    it("does not render the Open / Import button when !isSignedIn", () => {
        renderTopNavBar({ isSignedIn: false });
        expect(screen.queryByRole("button", { name: /open \/ import/i })).not.toBeInTheDocument();
    });

    it("calls onImportClick exactly once when Open / Import is clicked", () => {
        const { props } = renderTopNavBar({ isSignedIn: true });
        fireEvent.click(screen.getByRole("button", { name: /open \/ import/i }));
        expect(props.onImportClick).toHaveBeenCalledTimes(1);
    });

    it("does not render the Profile button when not signed in", () => {
        renderTopNavBar({ isSignedIn: false });
        expect(screen.queryByRole("button", { name: /profile/i })).not.toBeInTheDocument();
    });

    it("displays the user's email in the Profile button when isSignedIn is true", () => {
        const user: ClerkUser = { id: "u1", primaryEmailAddress: { emailAddress: "a@b.com" } };
        renderTopNavBar({ isSignedIn: true, user });
        expect(screen.getByRole("button", { name: /a@b.com/i })).toBeInTheDocument();
    });

    it("calls onProfileClick exactly once when the Profile button is clicked", () => {
        const user: ClerkUser = { id: "u1", primaryEmailAddress: { emailAddress: "a@b.com" } };
        const { props } = renderTopNavBar({ isSignedIn: true, user });
        fireEvent.click(screen.getByRole("button", { name: /a@b.com/i }));
        expect(props.onProfileClick).toHaveBeenCalledTimes(1);
    });

    it("renders gracefully when user is null or has no email", () => {
        const { unmount } = renderTopNavBar({ isSignedIn: true, user: null });
        expect(screen.getByText("Run")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();
        unmount();

        renderTopNavBar({ isSignedIn: true, user: { id: "u1", primaryEmailAddress: { emailAddress: "" } } });
        expect(screen.getByText("Run")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();
        unmount();
    });

    it("shows 'Loading Python...' when isReady is false", () => {
        renderTopNavBar({ isReady: false });
        expect(screen.getByText("Loading Python...")).toBeInTheDocument();
    });

    it("displays the package version when the environment is ready", () => {
        renderTopNavBar({ isReady: true });
        expect(screen.getByText(new RegExp(`Version ${version}`))).toBeInTheDocument();
    });

    it("shows the green dot (bg-green-500 class) and 'Environment Ready ... Version X' when isReady is true", () => {
        const { container } = renderTopNavBar({ isReady: true });
        expect(container.querySelector("span.bg-green-500")).toBeInTheDocument();
        expect(screen.getByText(/Environment Ready/i)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(`Version ${version}`))).toBeInTheDocument();
    });

    it("has no axe a11y violations when signed out", async () => {
        const { container } = renderTopNavBar({ isSignedIn: false });
        expect(await axeCheck(container)).toHaveNoViolations();
    });

    it("has no axe a11y violations when signed in", async () => {
        const user: ClerkUser = { id: "u1", primaryEmailAddress: { emailAddress: "a@b.com" } };
        const { container } = renderTopNavBar({ isSignedIn: true, user, isReady: true, activeFileId: 1 });
        expect(await axeCheck(container)).toHaveNoViolations();
    });

    it("exposes the header as a banner landmark", () => {
        renderTopNavBar();
        expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    it("groups action buttons in a labelled toolbar landmark", () => {
        renderTopNavBar({ isSignedIn: true, isReady: true, activeFileId: 1 });
        const toolbar = screen.getByRole("toolbar", { name: /file actions/i });
        expect(toolbar).toBeInTheDocument();
        expect(toolbar).toContainElement(screen.getByRole("button", { name: /run/i }));
        expect(toolbar).toContainElement(screen.getByRole("button", { name: /^save$/i }));
    });

    it("exposes the environment status as a polite live region", () => {
        renderTopNavBar({ isReady: false });
        const status = screen.getByRole("status", { name: /python environment status/i });
        expect(status).toHaveTextContent(/loading python/i);
        expect(status).toHaveAttribute("aria-live", "polite");
    });

    it("announces the ready state in the status live region", () => {
        renderTopNavBar({ isReady: true });
        const status = screen.getByRole("status", { name: /python environment status/i });
        expect(status).toHaveTextContent(/environment ready/i);
    });

    it("marks all decorative icons as aria-hidden", () => {
        const user: ClerkUser = { id: "u1", primaryEmailAddress: { emailAddress: "a@b.com" } };
        const { container } = renderTopNavBar({ isSignedIn: true, user, isReady: true, activeFileId: 1 });
        const icons = container.querySelectorAll("svg");
        expect(icons.length).toBeGreaterThan(0);
        icons.forEach((icon) => {
            expect(icon).toHaveAttribute("aria-hidden", "true");
        });
    });
});