import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UsageSummary } from "./usage-summary";

// Mock the API hooks
vi.mock("#/hooks/query/use-token-balance", () => ({
  useTokenBalance: vi.fn(() => ({
    data: {
      subscription_tokens_available: 1500000,
      topup_tokens_available: 250000,
      free_tier_tokens_available: 0,
      total_available: 1750000,
      last_reset: "2024-01-01T00:00:00Z",
    },
    isLoading: false,
    error: null,
  }),
}));

vi.mock("#/hooks/query/use-subscription", () => ({
  useSubscription: vi.fn(() => ({
    data: {
      subscription: {
        plan: {
          tokens_per_month: 2000000,
          display_name: "Basic Plan",
        },
        current_period_end: "2024-01-31T23:59:59Z",
      },
    },
    isLoading: false,
    error: null,
  }),
}));

describe("UsageSummary", () => {
  it("renders token balance information", () => {
    render(<UsageSummary />);

    expect(screen.getByText("Token Usage")).toBeInTheDocument();
    expect(screen.getByText("1,750,000")).toBeInTheDocument(); // Total available
    expect(screen.getByText("1,500,000")).toBeInTheDocument(); // Subscription tokens
    expect(screen.getByText("250,000")).toBeInTheDocument(); // Top-up tokens
  });

  it("shows subscription plan information", () => {
    render(<UsageSummary />);

    expect(screen.getByText("Basic Plan")).toBeInTheDocument();
    expect(screen.getByText(/2,000,000 tokens\/month/)).toBeInTheDocument();
  });

  it("calculates and displays usage percentage", () => {
    render(<UsageSummary />);

    // Usage: (2M - 1.5M) / 2M = 0.25 = 25%
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "25");
    expect(screen.getByText("25% used")).toBeInTheDocument();
  });

  it("shows renewal date", () => {
    render(<UsageSummary />);

    expect(screen.getByText(/Renews on/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 31, 2024/)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    const { useTokenBalance } = vi.mocked(
      await import("#/hooks/query/use-token-balance")
    );
    
    useTokenBalance.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<UsageSummary />);

    expect(screen.getByText("Loading usage data...")).toBeInTheDocument();
  });

  it("shows error state for token balance", () => {
    const { useTokenBalance } = vi.mocked(
      await import("#/hooks/query/use-token-balance")
    );
    
    useTokenBalance.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to load balance"),
    });

    render(<UsageSummary />);

    expect(screen.getByText("Failed to load usage data")).toBeInTheDocument();
  });

  it("handles free tier users", () => {
    const { useSubscription } = vi.mocked(
      await import("#/hooks/query/use-subscription")
    );
    
    const { useTokenBalance } = vi.mocked(
      await import("#/hooks/query/use-token-balance")
    );
    
    useSubscription.mockReturnValue({
      data: {
        subscription: null,
      },
      isLoading: false,
      error: null,
    });

    useTokenBalance.mockReturnValue({
      data: {
        subscription_tokens_available: 0,
        topup_tokens_available: 0,
        free_tier_tokens_available: 35000,
        total_available: 35000,
        last_reset: "2024-01-01T00:00:00Z",
      },
      isLoading: false,
      error: null,
    });

    render(<UsageSummary />);

    expect(screen.getByText("Free Tier")).toBeInTheDocument();
    expect(screen.getByText("35,000")).toBeInTheDocument(); // Total available
    expect(screen.getByText(/50,000 tokens\/month/)).toBeInTheDocument();
    
    // Usage: (50K - 35K) / 50K = 0.3 = 30%
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "30");
  });

  it("displays warning when usage is high", () => {
    const { useTokenBalance } = vi.mocked(
      await import("#/hooks/query/use-token-balance")
    );
    
    useTokenBalance.mockReturnValue({
      data: {
        subscription_tokens_available: 100000, // Only 100K left
        topup_tokens_available: 0,
        free_tier_tokens_available: 0,
        total_available: 100000,
        last_reset: "2024-01-01T00:00:00Z",
      },
      isLoading: false,
      error: null,
    });

    render(<UsageSummary />);

    // Usage: (2M - 100K) / 2M = 0.95 = 95%
    expect(screen.getByText("95% used")).toBeInTheDocument();
    expect(screen.getByText(/Low token balance/i)).toBeInTheDocument();
  });

  it("shows top-up tokens separately", () => {
    render(<UsageSummary />);

    const topUpSection = screen.getByText("Top-up Tokens");
    expect(topUpSection).toBeInTheDocument();
    expect(screen.getByText("250,000")).toBeInTheDocument();
  });

  it("handles subscription without plan details", () => {
    const { useSubscription } = vi.mocked(
      await import("#/hooks/query/use-subscription")
    );
    
    useSubscription.mockReturnValue({
      data: {
        subscription: {
          plan: null,
          current_period_end: "2024-01-31T23:59:59Z",
        },
      },
      isLoading: false,
      error: null,
    });

    render(<UsageSummary />);

    expect(screen.getByText("Unknown Plan")).toBeInTheDocument();
  });

  it("formats large numbers with commas", () => {
    const { useTokenBalance } = vi.mocked(
      await import("#/hooks/query/use-token-balance")
    );
    
    useTokenBalance.mockReturnValue({
      data: {
        subscription_tokens_available: 10000000,
        topup_tokens_available: 5000000,
        free_tier_tokens_available: 0,
        total_available: 15000000,
        last_reset: "2024-01-01T00:00:00Z",
      },
      isLoading: false,
      error: null,
    });

    render(<UsageSummary />);

    expect(screen.getByText("15,000,000")).toBeInTheDocument();
    expect(screen.getByText("10,000,000")).toBeInTheDocument();
    expect(screen.getByText("5,000,000")).toBeInTheDocument();
  });
});