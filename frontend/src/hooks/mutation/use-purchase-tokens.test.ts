import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { usePurchaseTokens } from "./use-purchase-tokens";
import { OpenHandsApiClient } from "#/api/open-hands";
import { toast } from "sonner";

// Mock the API client
vi.mock("#/api/open-hands", () => ({
  OpenHandsApiClient: {
    purchaseTokens: vi.fn(),
  },
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("usePurchaseTokens", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("purchases tokens successfully", async () => {
    const mockResponse = {
      payment_intent_id: "pi_123",
      client_secret: "pi_123_secret",
      amount_tokens: 1000000,
      amount_cents: 800,
    };

    vi.mocked(OpenHandsApiClient.purchaseTokens).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => usePurchaseTokens(), { wrapper });

    await act(async () => {
      result.current.mutate({
        amount: 1000000,
        paymentMethodId: "pm_123",
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(OpenHandsApiClient.purchaseTokens).toHaveBeenCalledWith({
      amount: 1000000,
      paymentMethodId: "pm_123",
    });

    expect(result.current.data).toEqual(mockResponse);
    expect(toast.success).toHaveBeenCalledWith("Token purchase initiated");
  });

  it("handles purchase error", async () => {
    const error = new Error("Payment failed");
    vi.mocked(OpenHandsApiClient.purchaseTokens).mockRejectedValue(error);

    const { result } = renderHook(() => usePurchaseTokens(), { wrapper });

    await act(async () => {
      result.current.mutate({
        amount: 1000000,
        paymentMethodId: "pm_123",
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
    expect(toast.error).toHaveBeenCalledWith("Failed to purchase tokens");
  });

  it("invalidates token balance on success", async () => {
    const mockResponse = {
      payment_intent_id: "pi_123",
      client_secret: "pi_123_secret",
      amount_tokens: 1000000,
      amount_cents: 800,
    };

    vi.mocked(OpenHandsApiClient.purchaseTokens).mockResolvedValue(mockResponse);

    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => usePurchaseTokens(), { wrapper });

    await act(async () => {
      result.current.mutate({
        amount: 1000000,
        paymentMethodId: "pm_123",
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["token-balance"],
    });
  });

  it("shows loading state during purchase", async () => {
    vi.mocked(OpenHandsApiClient.purchaseTokens).mockReturnValue(
      new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => usePurchaseTokens(), { wrapper });

    act(() => {
      result.current.mutate({
        amount: 1000000,
        paymentMethodId: "pm_123",
      });
    });

    expect(result.current.isPending).toBe(true);
    expect(result.current.isIdle).toBe(false);
  });

  it("resets state after mutation", async () => {
    const mockResponse = {
      payment_intent_id: "pi_123",
      client_secret: "pi_123_secret",
      amount_tokens: 1000000,
      amount_cents: 800,
    };

    vi.mocked(OpenHandsApiClient.purchaseTokens).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => usePurchaseTokens(), { wrapper });

    await act(async () => {
      result.current.mutate({
        amount: 1000000,
        paymentMethodId: "pm_123",
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.isIdle).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("accepts onSuccess callback", async () => {
    const mockResponse = {
      payment_intent_id: "pi_123",
      client_secret: "pi_123_secret",
      amount_tokens: 1000000,
      amount_cents: 800,
    };

    vi.mocked(OpenHandsApiClient.purchaseTokens).mockResolvedValue(mockResponse);

    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => usePurchaseTokens({ onSuccess }),
      { wrapper }
    );

    await act(async () => {
      result.current.mutate({
        amount: 1000000,
        paymentMethodId: "pm_123",
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalledWith(mockResponse);
  });

  it("accepts onError callback", async () => {
    const error = new Error("Payment failed");
    vi.mocked(OpenHandsApiClient.purchaseTokens).mockRejectedValue(error);

    const onError = vi.fn();
    const { result } = renderHook(
      () => usePurchaseTokens({ onError }),
      { wrapper }
    );

    await act(async () => {
      result.current.mutate({
        amount: 1000000,
        paymentMethodId: "pm_123",
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onError).toHaveBeenCalledWith(error);
  });

  it("handles network errors", async () => {
    const networkError = new Error("Network error");
    networkError.name = "NetworkError";
    vi.mocked(OpenHandsApiClient.purchaseTokens).mockRejectedValue(networkError);

    const { result } = renderHook(() => usePurchaseTokens(), { wrapper });

    await act(async () => {
      result.current.mutate({
        amount: 1000000,
        paymentMethodId: "pm_123",
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to purchase tokens");
  });

  it("validates token amount", async () => {
    const { result } = renderHook(() => usePurchaseTokens(), { wrapper });

    // Test with invalid amount
    await act(async () => {
      result.current.mutate({
        amount: -1000, // Invalid negative amount
        paymentMethodId: "pm_123",
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(OpenHandsApiClient.purchaseTokens).not.toHaveBeenCalled();
  });

  it("requires payment method ID", async () => {
    const { result } = renderHook(() => usePurchaseTokens(), { wrapper });

    // Test without payment method ID
    await act(async () => {
      result.current.mutate({
        amount: 1000000,
        paymentMethodId: "", // Empty payment method
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(OpenHandsApiClient.purchaseTokens).not.toHaveBeenCalled();
  });
});