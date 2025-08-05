import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useSubscription } from "./use-subscription";
import { OpenHandsApiClient } from "#/api/open-hands";

// Mock the API client
vi.mock("#/api/open-hands", () => ({
  OpenHandsApiClient: {
    getSubscriptionStatus: vi.fn(),
  },
}));

describe("useSubscription", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("fetches subscription data successfully", async () => {
    const mockSubscription = {
      subscription: {
        id: "sub_123",
        status: "active",
        plan: {
          id: "plan_pro",
          name: "pro",
          display_name: "Pro Plan",
          price_cents: 2000,
          tokens_per_month: 5000000,
        },
        current_period_start: "2024-01-01T00:00:00Z",
        current_period_end: "2024-01-31T23:59:59Z",
      },
    };

    vi.mocked(OpenHandsApiClient.getSubscriptionStatus).mockResolvedValue(
      mockSubscription
    );

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSubscription);
    expect(OpenHandsApiClient.getSubscriptionStatus).toHaveBeenCalledTimes(1);
  });

  it("handles loading state", () => {
    vi.mocked(OpenHandsApiClient.getSubscriptionStatus).mockReturnValue(
      new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useSubscription(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("handles error state", async () => {
    const error = new Error("Failed to fetch subscription");
    vi.mocked(OpenHandsApiClient.getSubscriptionStatus).mockRejectedValue(error);

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.data).toBeUndefined();
  });

  it("handles no subscription (free tier)", async () => {
    const mockResponse = {
      subscription: null,
    };

    vi.mocked(OpenHandsApiClient.getSubscriptionStatus).mockResolvedValue(
      mockResponse
    );

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.subscription).toBeNull();
  });

  it("refetches on window focus", async () => {
    const mockSubscription = {
      subscription: {
        id: "sub_123",
        status: "active",
      },
    };

    vi.mocked(OpenHandsApiClient.getSubscriptionStatus).mockResolvedValue(
      mockSubscription
    );

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(OpenHandsApiClient.getSubscriptionStatus).toHaveBeenCalledTimes(1);

    // Simulate window focus
    window.dispatchEvent(new Event("focus"));

    await waitFor(() => {
      expect(OpenHandsApiClient.getSubscriptionStatus).toHaveBeenCalledTimes(2);
    });
  });

  it("provides hasActiveSubscription helper", async () => {
    const mockSubscription = {
      subscription: {
        id: "sub_123",
        status: "active",
        plan: {
          id: "plan_pro",
          name: "pro",
        },
      },
    };

    vi.mocked(OpenHandsApiClient.getSubscriptionStatus).mockResolvedValue(
      mockSubscription
    );

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.hasActiveSubscription).toBe(true);
  });

  it("hasActiveSubscription is false for cancelled subscriptions", async () => {
    const mockSubscription = {
      subscription: {
        id: "sub_123",
        status: "cancelled",
        plan: {
          id: "plan_pro",
          name: "pro",
        },
      },
    };

    vi.mocked(OpenHandsApiClient.getSubscriptionStatus).mockResolvedValue(
      mockSubscription
    );

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.hasActiveSubscription).toBe(false);
  });

  it("hasActiveSubscription is false for free tier", async () => {
    const mockResponse = {
      subscription: null,
    };

    vi.mocked(OpenHandsApiClient.getSubscriptionStatus).mockResolvedValue(
      mockResponse
    );

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.hasActiveSubscription).toBe(false);
  });

  it("enables query by default", () => {
    vi.mocked(OpenHandsApiClient.getSubscriptionStatus).mockResolvedValue({
      subscription: null,
    });

    const { result } = renderHook(() => useSubscription(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it("disables query when enabled is false", () => {
    vi.mocked(OpenHandsApiClient.getSubscriptionStatus).mockResolvedValue({
      subscription: null,
    });

    const { result } = renderHook(() => useSubscription({ enabled: false }), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(OpenHandsApiClient.getSubscriptionStatus).not.toHaveBeenCalled();
  });
});