import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserProfileModal } from "@/components/UserProfileModal";

// Mock hooks
const mockUpdateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();

let mockUpdateIsPending = false;
let mockDeleteIsPending = false;
vi.mock("@/hooks/use-user-profile", () => ({
  useUpdateUserProfile: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: mockUpdateIsPending,
  }),
  useDeleteUserProfile: () => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: mockDeleteIsPending,
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
    mockUpdateIsPending = false;
    mockDeleteIsPending = false;
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

  it("submitting edit form with password calls user.updatePassword", async () => {
    const user = userEvent.setup();
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );

    // Switch to edit mode
    await user.click(screen.getByText("Edit Profile"));

    // Fill in a valid password (>= 8 chars)
    const passwordInput = screen.getByLabelText("New Password");
    const confirmInput = screen.getByLabelText("Confirm Password");
    await user.clear(passwordInput);
    await user.type(passwordInput, "newpass123");
    await user.clear(confirmInput);
    await user.type(confirmInput, "newpass123");

    // Submit the form
    await user.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockUser.updatePassword).toHaveBeenCalledWith({ newPassword: "newpass123" });
    });
  });

  it("password update error does not crash and profile still saves", async () => {
    mockUser.updatePassword.mockRejectedValueOnce(new Error("Clerk error"));
    const user = userEvent.setup();
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );

    await user.click(screen.getByText("Edit Profile"));

    const passwordInput = screen.getByLabelText("New Password");
    const confirmInput = screen.getByLabelText("Confirm Password");
    await user.clear(passwordInput);
    await user.type(passwordInput, "newpass123");
    await user.clear(confirmInput);
    await user.type(confirmInput, "newpass123");

    await user.click(screen.getByText("Save Changes"));

    // Profile update should still have been called
    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalled();
    });

    // updatePassword was called but threw — no crash
    expect(mockUser.updatePassword).toHaveBeenCalled();
  });

  it("shows empty name and email when user fields are null", () => {
    const nullUser = {
      primaryEmailAddress: null,
      fullName: null,
      firstName: null,
      externalAccounts: [],
      passwordEnabled: true,
      updatePassword: vi.fn(),
    };
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={nullUser}
        profile={mockProfile}
      />
    );
    // With no name or email, those fields should show empty or fallback text
    // The "Not set" label appears for missing profile data, but name/email render as empty strings
    expect(screen.queryByText("Test User")).not.toBeInTheDocument();
    expect(screen.queryByText("test@example.com")).not.toBeInTheDocument();
  });

  it("phone without country code prefix shows full number in edit mode", () => {
    const profileNoCode = { ...mockProfile, phone: "5551234567" };
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={profileNoCode}
      />
    );
    fireEvent.click(screen.getByText("Edit Profile"));

    // The regex replace finds no country code prefix, so full number is used
    const phoneInput = screen.getByLabelText("Phone Number") as HTMLInputElement;
    expect(phoneInput.value).toBe("5551234567");
  });

  it("Cancel in view mode calls handleClose (setIsEditing false + onClose)", () => {
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );

    // In view mode, clicking Cancel calls handleClose
    fireEvent.click(screen.getByText("Cancel"));

    expect(onClose).toHaveBeenCalled();
  });

  it("changing country in edit mode calls handleCountryChange", async () => {
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );

    // Switch to edit mode
    fireEvent.click(screen.getByText("Edit Profile"));

    // The phone code prefix should show +1 (US default)
    expect(screen.getByText("+1")).toBeInTheDocument();

    // Change country via the hidden native select (Radix UI)
    const nativeSelect = document.querySelector("select[aria-hidden='true']") as HTMLSelectElement;
    expect(nativeSelect).toBeTruthy();
    fireEvent.change(nativeSelect, { target: { value: "DE" } });

    // The phone code prefix should now show +49
    await waitFor(() => {
      expect(screen.getByText("+49")).toBeInTheDocument();
    });
  });

  it("closing dialog via overlay calls handleClose", () => {
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );

    // The Dialog's close button (X) triggers onOpenChange which calls handleClose
    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("submitting edit form without password only updates profile", async () => {
    const user = userEvent.setup();
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );

    await user.click(screen.getByText("Edit Profile"));

    // Modify city without touching password fields
    const cityInput = screen.getByLabelText("City");
    await user.clear(cityInput);
    await user.type(cityInput, "Seattle");

    await user.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ city: "Seattle" })
      );
    });

    // updatePassword should NOT have been called (no password entered)
    expect(mockUser.updatePassword).not.toHaveBeenCalled();

    // Should return to view mode
    await waitFor(() => {
      expect(screen.getByText("Edit Profile")).toBeInTheDocument();
    });
  });

  it("shows password validation error when password is too short", async () => {
    const user = userEvent.setup();
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );

    await user.click(screen.getByText("Edit Profile"));

    const passwordInput = screen.getByLabelText("New Password");
    await user.type(passwordInput, "short");

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
    });
  });

  it("shows confirm password mismatch error", async () => {
    const user = userEvent.setup();
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );

    await user.click(screen.getByText("Edit Profile"));

    const passwordInput = screen.getByLabelText("New Password");
    const confirmInput = screen.getByLabelText("Confirm Password");
    await user.type(passwordInput, "validpassword1");
    await user.type(confirmInput, "differentpass1");

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });

  it("shows 'Saving...' when updateProfile.isPending is true", () => {
    mockUpdateIsPending = true;
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
    expect(screen.getByText("Saving...")).toBeInTheDocument();
    expect(screen.queryByText("Save Changes")).not.toBeInTheDocument();
  });

  it("shows 'Deleting...' when deleteProfile.isPending is true", () => {
    mockDeleteIsPending = true;
    render(
      <UserProfileModal
        open={true}
        onClose={onClose}
        onDeleteProfile={onDeleteProfile}
        user={mockUser}
        profile={mockProfile}
      />
    );

    // Open the delete confirmation dialog
    fireEvent.click(screen.getByText("Delete Profile"));

    // The confirm button in the alert dialog should show "Deleting..."
    expect(screen.getByText("Deleting...")).toBeInTheDocument();
  });
});
