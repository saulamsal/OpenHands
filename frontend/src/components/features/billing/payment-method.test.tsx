import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PaymentMethod } from "./payment-method";

// Mock the API hooks
vi.mock("#/hooks/query/use-payment-methods", () => ({
  usePaymentMethods: vi.fn(() => ({
    data: [
      {
        id: "pm_1234",
        type: "card",
        card: {
          brand: "visa",
          last4: "4242",
          exp_month: 12,
          exp_year: 2025,
        },
        is_default: true,
      },
      {
        id: "pm_5678",
        type: "card",
        card: {
          brand: "mastercard",
          last4: "5555",
          exp_month: 6,
          exp_year: 2026,
        },
        is_default: false,
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("#/hooks/mutation/use-add-payment-method", () => ({
  useAddPaymentMethod: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

vi.mock("#/hooks/mutation/use-remove-payment-method", () => ({
  useRemovePaymentMethod: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

vi.mock("#/hooks/mutation/use-set-default-payment-method", () => ({
  useSetDefaultPaymentMethod: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

describe("PaymentMethod", () => {
  it("renders payment methods list", () => {
    render(<PaymentMethod />);

    expect(screen.getByText("Payment Methods")).toBeInTheDocument();
    expect(screen.getByText("•••• 4242")).toBeInTheDocument();
    expect(screen.getByText("•••• 5555")).toBeInTheDocument();
  });

  it("displays card brand icons", () => {
    render(<PaymentMethod />);

    expect(screen.getByText("Visa")).toBeInTheDocument();
    expect(screen.getByText("Mastercard")).toBeInTheDocument();
  });

  it("shows expiration dates", () => {
    render(<PaymentMethod />);

    expect(screen.getByText("12/25")).toBeInTheDocument();
    expect(screen.getByText("06/26")).toBeInTheDocument();
  });

  it("indicates default payment method", () => {
    render(<PaymentMethod />);

    const defaultBadges = screen.getAllByText("Default");
    expect(defaultBadges).toHaveLength(1);
  });

  it("shows add payment method button", () => {
    render(<PaymentMethod />);

    expect(screen.getByText("Add Payment Method")).toBeInTheDocument();
  });

  it("opens add payment method dialog", () => {
    render(<PaymentMethod />);

    const addButton = screen.getByText("Add Payment Method");
    fireEvent.click(addButton);

    expect(screen.getByText("Add New Payment Method")).toBeInTheDocument();
    expect(screen.getByText("You will be redirected to Stripe")).toBeInTheDocument();
  });

  it("calls remove payment method mutation", async () => {
    const { useRemovePaymentMethod } = vi.mocked(
      await import("#/hooks/mutation/use-remove-payment-method")
    );
    
    const mockMutate = vi.fn();
    useRemovePaymentMethod.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
    });

    render(<PaymentMethod />);

    const removeButtons = screen.getAllByLabelText("Remove payment method");
    fireEvent.click(removeButtons[1]); // Click remove on non-default card

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({ paymentMethodId: "pm_5678" });
    });
  });

  it("calls set default payment method mutation", async () => {
    const { useSetDefaultPaymentMethod } = vi.mocked(
      await import("#/hooks/mutation/use-set-default-payment-method")
    );
    
    const mockMutate = vi.fn();
    useSetDefaultPaymentMethod.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
    });

    render(<PaymentMethod />);

    const setDefaultButtons = screen.getAllByText("Set as Default");
    fireEvent.click(setDefaultButtons[0]); // Click on non-default card

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({ paymentMethodId: "pm_5678" });
    });
  });

  it("disables remove button for default payment method", () => {
    render(<PaymentMethod />);

    const removeButtons = screen.getAllByLabelText("Remove payment method");
    expect(removeButtons[0]).toBeDisabled(); // First card is default
    expect(removeButtons[1]).not.toBeDisabled();
  });

  it("shows loading state", () => {
    const { usePaymentMethods } = vi.mocked(
      await import("#/hooks/query/use-payment-methods")
    );
    
    usePaymentMethods.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<PaymentMethod />);

    expect(screen.getByText("Loading payment methods...")).toBeInTheDocument();
  });

  it("shows error state", () => {
    const { usePaymentMethods } = vi.mocked(
      await import("#/hooks/query/use-payment-methods")
    );
    
    usePaymentMethods.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to load payment methods"),
    });

    render(<PaymentMethod />);

    expect(screen.getByText("Failed to load payment methods")).toBeInTheDocument();
  });

  it("shows empty state when no payment methods", () => {
    const { usePaymentMethods } = vi.mocked(
      await import("#/hooks/query/use-payment-methods")
    );
    
    usePaymentMethods.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<PaymentMethod />);

    expect(screen.getByText("No payment methods on file")).toBeInTheDocument();
    expect(screen.getByText("Add a payment method to purchase tokens")).toBeInTheDocument();
  });

  it("shows loading state during mutation", () => {
    const { useRemovePaymentMethod } = vi.mocked(
      await import("#/hooks/mutation/use-remove-payment-method")
    );
    
    useRemovePaymentMethod.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      error: null,
    });

    render(<PaymentMethod />);

    const removeButtons = screen.getAllByLabelText("Remove payment method");
    expect(removeButtons[1]).toBeDisabled();
  });

  it("handles expired cards", () => {
    const { usePaymentMethods } = vi.mocked(
      await import("#/hooks/query/use-payment-methods")
    );
    
    usePaymentMethods.mockReturnValue({
      data: [
        {
          id: "pm_expired",
          type: "card",
          card: {
            brand: "visa",
            last4: "1111",
            exp_month: 1,
            exp_year: 2023, // Expired
          },
          is_default: false,
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<PaymentMethod />);

    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByText("01/23")).toHaveClass("text-destructive");
  });

  it("formats card brands correctly", () => {
    const { usePaymentMethods } = vi.mocked(
      await import("#/hooks/query/use-payment-methods")
    );
    
    usePaymentMethods.mockReturnValue({
      data: [
        {
          id: "pm_amex",
          type: "card",
          card: {
            brand: "amex",
            last4: "0005",
            exp_month: 3,
            exp_year: 2027,
          },
          is_default: false,
        },
        {
          id: "pm_discover",
          type: "card",
          card: {
            brand: "discover",
            last4: "6011",
            exp_month: 9,
            exp_year: 2028,
          },
          is_default: false,
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<PaymentMethod />);

    expect(screen.getByText("American Express")).toBeInTheDocument();
    expect(screen.getByText("Discover")).toBeInTheDocument();
  });
});