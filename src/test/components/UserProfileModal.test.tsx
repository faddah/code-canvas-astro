import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserProfileModal } from "@/components/UserProfileModal";

// Mock hooks
const mockUpdateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();

vi.mock("@/hooks/use-user-profile", () => ({
  useUpdateUserProfile: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
  useDeleteUserProfile: () => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn(), toasts: [] }),
}));

interface MockProfile {
  phone: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const mockProfile: MockProfile = {
  phone: "+1 5551234567",
  city: "Portland",
  state: "OR",
  postalCode: "97201",
  country: "US",
};

interface MockUser {
  primaryEmailAddress: { emailAddress: string };
  fullName: string | null;
  firstName: string;
  externalAccounts: Array<{ provider: string }>;
  passwordEnabled: boolean;
  updatePassword: ReturnType<typeof vi.fn>;
}

const mockUser: MockUser = {
  primaryEmailAddress: { emailAddress: "test@example.com" },
  fullName: "Test User",
  firstName: "Test",
  externalAccounts: [],
  passwordEnabled: true,
  updatePassword: vi.fn(),
};

describe("UserProfileModal", () => {
  let onClose: () => void;
  let onDeleteProfile: () => void;

  beforeEach(() => {
    onClose = vi.fn() as () => void;  // ← Add type assertion
    onDeleteProfile = vi.fn() as () => void;  // ← Add type assertion
    mockUpdateMutateAsync.mockReset().mockResolvedValue({});
    mockDeleteMutateAsync.mockReset().mockResolvedValue({});
    mockUser.updatePassword.mockReset();
  });

  it("renders dialog with User Profile title", () => {
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );
    expect(screen.getByText("User Profile")).toBeInTheDocument();
  });

  it("shows profile fields in view mode", () => {
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("+1 5551234567")).toBeInTheDocument();
    expect(screen.getByText("Portland")).toBeInTheDocument();
    expect(screen.getByText("OR")).toBeInTheDocument();
    expect(screen.getByText("97201")).toBeInTheDocument();
    expect(screen.getByText("US")).toBeInTheDocument();
  });

  it("shows 'Not set' for missing profile fields", () => {
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={null}
      />
    );
    const notSetElements = screen.getAllByText("Not set");
    expect(notSetElements.length).toBeGreaterThanOrEqual(4);
  });

  it("shows Edit Profile, Cancel, and Delete Profile buttons in view mode", () => {
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );
    expect(screen.getByText("Edit Profile")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Delete Profile")).toBeInTheDocument();
  });

  it("switches to edit mode when Edit Profile is clicked", () => {
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );
    fireEvent.click(screen.getByText("Edit Profile"));
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
    expect(screen.getByLabelText("City")).toBeInTheDocument();
  });

  it("shows password fields for non-OAuth users in edit mode", () => {
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );
    fireEvent.click(screen.getByText("Edit Profile"));
    expect(screen.getByLabelText("New Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
  });

  it("hides password fields for OAuth users in edit mode", () => {
    const oauthUser = {
      ...mockUser,
      externalAccounts: [{ provider: "google" }],
      passwordEnabled: false,
    };
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={oauthUser}
        profile={mockProfile}
      />
    );
    fireEvent.click(screen.getByText("Edit Profile"));
    expect(screen.queryByLabelText("New Password")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Confirm Password")).not.toBeInTheDocument();
  });

  it("returns to view mode when Cancel is clicked in edit mode", () => {
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );
    fireEvent.click(screen.getByText("Edit Profile"));
    expect(screen.getByText("Save Changes")).toBeInTheDocument();

    // In edit mode, the Cancel button should switch back to view mode
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByText("Edit Profile")).toBeInTheDocument();
  });

  it("shows delete confirmation dialog", () => {
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );
    fireEvent.click(screen.getByText("Delete Profile"));
    expect(screen.getByText("Delete Account")).toBeInTheDocument();
    expect(screen.getByText(/Are you certain/)).toBeInTheDocument();
  });

  it("calls deleteProfile and onDeleteProfile when confirmed", async () => {
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );

    // Open delete confirmation
    fireEvent.click(screen.getByText("Delete Profile"));

    // Click the confirm delete button in the AlertDialog
    const confirmBtn = screen.getAllByText("Delete Profile").find(
      (el) => el.closest("[role='alertdialog']")
    );
    // The confirm button text is "Delete Profile" in the alert dialog
    fireEvent.click(confirmBtn || screen.getByText("Delete Profile"));

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(onDeleteProfile).toHaveBeenCalled();
    });
  });

  it("shows 'Managed by Clerk' hints in edit mode for name and email", () => {
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );
    fireEvent.click(screen.getByText("Edit Profile"));
    const hints = screen.getAllByText("Managed by Clerk");
    expect(hints.length).toBe(2);
  });

  it("does not render when open is false", () => {
    const { container } = render(
      <UserProfileModal
        open={false}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );
    expect(screen.queryByText("User Profile")).not.toBeInTheDocument();
  });

  it("shows masked password in view mode", () => {
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );
    expect(screen.getByText("**********")).toBeInTheDocument();
  });

  it("uses firstName fallback when fullName is missing", () => {
    const userNoFullName = { ...mockUser, fullName: null };
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={userNoFullName}
        profile={mockProfile}
      />
    );
    expect(screen.getByText("Test")).toBeInTheDocument();
  });
});
