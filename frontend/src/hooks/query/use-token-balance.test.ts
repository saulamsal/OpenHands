import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useTokenBalance } from "./use-token-balance";
import { OpenHandsApiClient } from "#/api/open-hands";

// Mock the API client
vi.mock("#/api/open-hands", () => ({
  OpenHandsApiClient: {
    getTokenBalance: vi.fn(),
  },
}));

describe("useTokenBalance", () => {
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

  it("fetches token balance successfully", async () => {
    const mockBalance = {
      subscription_tokens_available: 2000000,
      topup_tokens_available: 500000,
      free_tier_tokens_available: 0,
      total_available: 2500000,
      last_reset: "2024-01-01T00:00:00Z",
    };

    vi.mocked(OpenHandsApiClient.getTokenBalance).mockResolvedValue(mockBalance);

    const { result } = renderHook(() => useTokenBalance(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockBalance);
    expect(OpenHandsApiClient.getTokenBalance).toHaveBeenCalledTimes(1);
  });

  it("handles loading state", () => {
    vi.mocked(OpenHandsApiClient.getTokenBalance).mockReturnValue(
      new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useTokenBalance(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("handles error state", async () => {
    const error = new Error("Failed to fetch balance");
    vi.mocked(OpenHandsApiClient.getTokenBalance).mockRejectedValue(error);

    const { result } = renderHook(() => useTokenBalance(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.data).toBeUndefined();
  });

  it("handles free tier user balance", async () => {
    const mockBalance = {
      subscription_tokens_available: 0,
      topup_tokens_available: 0,
      free_tier_tokens_available: 50000,
      total_available: 50000,
      last_reset: "2024-01-01T00:00:00Z",
    };

    vi.mocked(OpenHandsApiClient.getTokenBalance).mockResolvedValue(mockBalance);

    const { result } = renderHook(() => useTokenBalance(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.free_tier_tokens_available).toBe(50000);
    expect(result.current.data?.total_available).toBe(50000);
  });

  it("handles zero balance", async () => {
    const mockBalance = {
      subscription_tokens_available: 0,
      topup_tokens_available: 0,
      free_tier_tokens_available: 0,
      total_available: 0,
      last_reset: "2024-01-01T00:00:00Z",
    };

    vi.mocked(OpenHandsApiClient.getTokenBalance).mockResolvedValue(mockBalance);

    const { result } = renderHook(() => useTokenBalance(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.total_available).toBe(0);
  });

  it("refetches every 30 seconds", async () => {
    const mockBalance = {
      subscription_tokens_available: 1000000,
      topup_tokens_available: 0,
      free_tier_tokens_available: 0,
      total_available: 1000000,
      last_reset: "2024-01-01T00:00:00Z",
    };

    vi.mocked(OpenHandsApiClient.getTokenBalance).mockResolvedValue(mockBalance);
    vi.useFakeTimers();

    const { result } = renderHook(() => useTokenBalance(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(OpenHandsApiClient.getTokenBalance).toHaveBeenCalledTimes(1);

    // Fast forward 30 seconds
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(OpenHandsApiClient.getTokenBalance).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });

  it("provides hasTokens helper", async () => {
    const mockBalance = {
      subscription_tokens_available: 1000,
      topup_tokens_available: 500,
      free_tier_tokens_available: 0,
      total_available: 1500,
      last_reset: "2024-01-01T00:00:00Z",
    };

    vi.mocked(OpenHandsApiClient.getTokenBalance).mockResolvedValue(mockBalance);

    const { result } = renderHook(() => useTokenBalance(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.hasTokens).toBe(true);
  });

  it("hasTokens is false when balance is zero", async () => {
    const mockBalance = {
      subscription_tokens_available: 0,
      topup_tokens_available: 0,
      free_tier_tokens_available: 0,
      total_available: 0,
      last_reset: "2024-01-01T00:00:00Z",
    };

    vi.mocked(OpenHandsApiClient.getTokenBalance).mockResolvedValue(mockBalance);

    const { result } = renderHook(() => useTokenBalance(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.hasTokens).toBe(false);
  });

  it("provides isLowBalance helper", async () => {
    const mockBalance = {
      subscription_tokens_available: 50000, // Low balance
      topup_tokens_available: 0,
      free_tier_tokens_available: 0,
      total_available: 50000,
      last_reset: "2024-01-01T00:00:00Z",
    };

    vi.mocked(OpenHandsApiClient.getTokenBalance).mockResolvedValue(mockBalance);

    const { result } = renderHook(() => useTokenBalance(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.isLowBalance).toBe(true);
  });

  it("isLowBalance is false when balance is sufficient", async () => {
    const mockBalance = {
      subscription_tokens_available: 1000000,
      topup_tokens_available: 500000,
      free_tier_tokens_available: 0,
      total_available: 1500000,
      last_reset: "2024-01-01T00:00:00Z",
    };

    vi.mocked(OpenHandsApiClient.getTokenBalance).mockResolvedValue(mockBalance);

    const { result } = renderHook(() => useTokenBalance(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.isLowBalance).toBe(false);
  });

  it("enables query by default", () => {
    vi.mocked(OpenHandsApiClient.getTokenBalance).mockResolvedValue({
      subscription_tokens_available: 0,
      topup_tokens_available: 0,
      free_tier_tokens_available: 0,
      total_available: 0,
      last_reset: "2024-01-01T00:00:00Z",
    });

    const { result } = renderHook(() => useTokenBalance(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it("disables query when enabled is false", () => {
    vi.mocked(OpenHandsApiClient.getTokenBalance).mockResolvedValue({
      subscription_tokens_available: 0,
      topup_tokens_available: 0,
      free_tier_tokens_available: 0,
      total_available: 0,
      last_reset: "2024-01-01T00:00:00Z",
    });

    const { result } = renderHook(() => useTokenBalance({ enabled: false }), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(OpenHandsApiClient.getTokenBalance).not.toHaveBeenCalled();
  });
});