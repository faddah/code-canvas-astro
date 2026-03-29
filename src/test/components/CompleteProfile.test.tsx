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

  it("shows errors only for unfilled fields when some fields are filled", async () => {
    const user = userEvent.setup();
    render(<CompleteProfile onComplete={onComplete} onCancel={onCancel} />);

    // Fill phone and city, leave state and postalCode empty
    await user.type(screen.getByLabelText("Phone Number"), "5551234567");
    await user.type(screen.getByLabelText("City"), "Portland");

    fireEvent.click(screen.getByText("Save Profile"));

    await waitFor(() => {
      // State and postal code errors should appear
      expect(screen.getByText("State/Province is required")).toBeInTheDocument();
      expect(screen.getByText("Postal code is required")).toBeInTheDocument();
    });

    // Phone and city errors should NOT appear
    expect(screen.queryByText("Phone number must be at least 7 digits")).not.toBeInTheDocument();
    expect(screen.queryByText("City is required")).not.toBeInTheDocument();
  });

  it("shows errors only for phone and city when state and postal are filled", async () => {
    const user = userEvent.setup();
    render(<CompleteProfile onComplete={onComplete} onCancel={onCancel} />);

    // Fill state and postal, leave phone and city empty
    await user.type(screen.getByLabelText("State / Province"), "OR");
    await user.type(screen.getByLabelText("Postal Code"), "97201");

    fireEvent.click(screen.getByText("Save Profile"));

    await waitFor(() => {
      expect(screen.getByText("Phone number must be at least 7 digits")).toBeInTheDocument();
      expect(screen.getByText("City is required")).toBeInTheDocument();
    });

    // State and postal code errors should NOT appear
    expect(screen.queryByText("State/Province is required")).not.toBeInTheDocument();
    expect(screen.queryByText("Postal code is required")).not.toBeInTheDocument();
  });

  it("default country US shows +1 prefix", () => {
    render(<CompleteProfile onComplete={onComplete} onCancel={onCancel} />);
    // The phone code prefix for default country US should be +1
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("updates phone code prefix when country is changed", async () => {
    render(<CompleteProfile onComplete={onComplete} onCancel={onCancel} />);

    // Default is US (+1)
    expect(screen.getByText("+1")).toBeInTheDocument();

    // Radix Select renders a hidden native <select> for accessibility.
    // In jsdom, we interact with it via fireEvent.change on that native element.
    const nativeSelect = document.querySelector("select[aria-hidden='true']") as HTMLSelectElement;
    expect(nativeSelect).toBeTruthy();

    // Fire change to DE — this triggers the onValueChange callback
    fireEvent.change(nativeSelect, { target: { value: "DE" } });

    // The phone code prefix should now show +49
    await waitFor(() => {
      expect(screen.getByText("+49")).toBeInTheDocument();
    });
  });

  it("calls onCancel when dialog is closed via overlay/escape", () => {
    render(<CompleteProfile onComplete={onComplete} onCancel={onCancel} />);

    // The Dialog's close button (X) triggers onOpenChange(false) which calls onCancel
    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it("submits with changed country and correct phone prefix", async () => {
    const user = userEvent.setup();
    render(<CompleteProfile onComplete={onComplete} onCancel={onCancel} />);

    // Change country to GB via the hidden native select
    const nativeSelect = document.querySelector("select[aria-hidden='true']") as HTMLSelectElement;
    fireEvent.change(nativeSelect, { target: { value: "GB" } });

    await waitFor(() => {
      expect(screen.getByText("+44")).toBeInTheDocument();
    });

    // Fill in the rest of the form
    await user.type(screen.getByLabelText("Phone Number"), "2071234567");
    await user.type(screen.getByLabelText("City"), "London");
    await user.type(screen.getByLabelText("State / Province"), "England");
    await user.type(screen.getByLabelText("Postal Code"), "SW1A 1AA");

    fireEvent.click(screen.getByText("Save Profile"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "+44 2071234567",
          city: "London",
          state: "England",
          postalCode: "SW1A 1AA",
          country: "GB",
        })
      );
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
