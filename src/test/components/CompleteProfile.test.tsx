import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompleteProfile } from "@/components/CompleteProfile";

// Mock the useCreateUserProfile hook
const mockMutateAsync = vi.fn();
vi.mock("@/hooks/use-user-profile", () => ({
  useCreateUserProfile: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

// Mock the toast hook
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn(), toasts: [] }),
}));

describe("CompleteProfile", () => {
  let onComplete: ReturnType<typeof vi.fn<() => void>>;
  let onCancel: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    onComplete = vi.fn();
    onCancel = vi.fn();
    mockMutateAsync.mockReset();
    mockMutateAsync.mockResolvedValue({});
  });

  it("renders dialog with title and description", () => {
    render(<CompleteProfile onComplete={onComplete} onCancel={onCancel} />);
    expect(screen.getByText("Complete Your Profile")).toBeInTheDocument();
    expect(screen.getByText(/fill in your profile information/)).toBeInTheDocument();
  });

  it("renders all form fields", () => {
    render(<CompleteProfile onComplete={onComplete} onCancel={onCancel} />);
    expect(screen.getByText("Country")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone Number")).toBeInTheDocument();
    expect(screen.getByLabelText("City")).toBeInTheDocument();
    expect(screen.getByLabelText("State / Province")).toBeInTheDocument();
    expect(screen.getByLabelText("Postal Code")).toBeInTheDocument();
  });

  it("renders Cancel and Save Profile buttons", () => {
    render(<CompleteProfile onComplete={onComplete} onCancel={onCancel} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Save Profile")).toBeInTheDocument();
  });

  it("calls onCancel when Cancel button is clicked", async () => {
    render(<CompleteProfile onComplete={onComplete} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows phone country code prefix for default US", () => {
    render(<CompleteProfile onComplete={onComplete} onCancel={onCancel} />);
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("submits form with valid data and calls onComplete", async () => {
    const user = userEvent.setup();
    render(<CompleteProfile onComplete={onComplete} onCancel={onCancel} />);

    await user.type(screen.getByLabelText("Phone Number"), "5551234567");
    await user.type(screen.getByLabelText("City"), "Portland");
    await user.type(screen.getByLabelText("State / Province"), "OR");
    await user.type(screen.getByLabelText("Postal Code"), "97201");

    fireEvent.click(screen.getByText("Save Profile"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "+1 5551234567",
          city: "Portland",
          state: "OR",
          postalCode: "97201",
          country: "US",
        })
      );
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it("shows validation errors when submitting empty form", async () => {
    render(<CompleteProfile onComplete={onComplete} onCancel={onCancel} />);

    fireEvent.click(screen.getByText("Save Profile"));

    await waitFor(() => {
      expect(screen.getByText("Phone number must be at least 7 digits")).toBeInTheDocument();
    });
    expect(screen.getByText("City is required")).toBeInTheDocument();
    expect(screen.getByText("State/Province is required")).toBeInTheDocument();
    expect(screen.getByText("Postal code is required")).toBeInTheDocument();
  });
});
