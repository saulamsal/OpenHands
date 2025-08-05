import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PricingTiers } from "./pricing-tiers";

// Mock the API hooks
vi.mock("#/hooks/query/use-subscription-plans", () => ({
  useSubscriptionPlans: vi.fn().mockReturnValue({
    data: [
      {
        id: "plan_free",
        name: "free",
        display_name: "Free",
        price_cents: 0,
        tokens_per_month: 50000,
        popular: false,
        features: [
          "50K tokens/month",
          "2 conversations/day",
          "Community support",
        ],
      },
      {
        id: "plan_basic",
        name: "basic",
        display_name: "Basic",
        price_cents: 1000,
        tokens_per_month: 2000000,
        popular: false,
        features: [
          "2M tokens/month",
          "Unlimited conversations",
          "Email support",
        ],
      },
      {
        id: "plan_pro",
        name: "pro",
        display_name: "Pro",
        price_cents: 2000,
        tokens_per_month: 5000000,
        popular: true,
        features: [
          "5M tokens/month",
          "Unlimited conversations",
          "Priority support",
          "Advanced features",
        ],
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

describe("PricingTiers", () => {
  it("renders all pricing tiers", () => {
    const onSelectPlan = vi.fn();
    render(
      <PricingTiers
        type="individual"
        period="monthly"
        onSelectPlan={onSelectPlan}
      />,
    );

    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Basic")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
  });

  it("displays correct prices for monthly billing", () => {
    const onSelectPlan = vi.fn();
    render(
      <PricingTiers
        type="individual"
        period="monthly"
        onSelectPlan={onSelectPlan}
      />,
    );

    expect(screen.getByText("$0")).toBeInTheDocument();
    expect(screen.getByText("$10")).toBeInTheDocument();
    expect(screen.getByText("$20")).toBeInTheDocument();
  });

  it("displays correct prices for yearly billing", () => {
    const onSelectPlan = vi.fn();
    render(
      <PricingTiers
        type="individual"
        period="yearly"
        onSelectPlan={onSelectPlan}
      />,
    );

    // Yearly prices with 20% discount
    expect(screen.getByText("$0")).toBeInTheDocument();
    expect(screen.getByText("$96")).toBeInTheDocument(); // $10 * 12 * 0.8
    expect(screen.getByText("$192")).toBeInTheDocument(); // $20 * 12 * 0.8
  });

  it("shows popular badge on popular plans", () => {
    const onSelectPlan = vi.fn();
    render(
      <PricingTiers
        type="individual"
        period="monthly"
        onSelectPlan={onSelectPlan}
      />,
    );

    const popularBadges = screen.getAllByText("Most Popular");
    expect(popularBadges).toHaveLength(1);
  });

  it("calls onSelectPlan when a plan is selected", () => {
    const onSelectPlan = vi.fn();
    render(
      <PricingTiers
        type="individual"
        period="monthly"
        onSelectPlan={onSelectPlan}
      />,
    );

    const selectButtons = screen.getAllByText("Select Plan");
    fireEvent.click(selectButtons[1]); // Click on Basic plan

    expect(onSelectPlan).toHaveBeenCalledWith("plan_basic");
  });

  it("disables Free plan selection button", () => {
    const onSelectPlan = vi.fn();
    render(
      <PricingTiers
        type="individual"
        period="monthly"
        onSelectPlan={onSelectPlan}
      />,
    );

    const currentPlanButton = screen.getByText("Current Plan");
    expect(currentPlanButton).toBeDisabled();
  });

  it("displays all features for each plan", () => {
    const onSelectPlan = vi.fn();
    render(
      <PricingTiers
        type="individual"
        period="monthly"
        onSelectPlan={onSelectPlan}
      />,
    );

    // Free plan features
    expect(screen.getByText("50K tokens/month")).toBeInTheDocument();
    expect(screen.getByText("2 conversations/day")).toBeInTheDocument();
    expect(screen.getByText("Community support")).toBeInTheDocument();

    // Basic plan features
    expect(screen.getByText("2M tokens/month")).toBeInTheDocument();
    expect(screen.getByText("Email support")).toBeInTheDocument();

    // Pro plan features
    expect(screen.getByText("5M tokens/month")).toBeInTheDocument();
    expect(screen.getByText("Priority support")).toBeInTheDocument();
    expect(screen.getByText("Advanced features")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    const { useSubscriptionPlans } = vi.mocked(
      await import("#/hooks/query/use-subscription-plans"),
    );

    useSubscriptionPlans.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const onSelectPlan = vi.fn();
    render(
      <PricingTiers
        type="individual"
        period="monthly"
        onSelectPlan={onSelectPlan}
      />,
    );

    expect(screen.getByText("Loading plans...")).toBeInTheDocument();
  });

  it("shows error state", () => {
    const { useSubscriptionPlans } = vi.mocked(
      await import("#/hooks/query/use-subscription-plans"),
    );

    useSubscriptionPlans.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to load plans"),
    });

    const onSelectPlan = vi.fn();
    render(
      <PricingTiers
        type="individual"
        period="monthly"
        onSelectPlan={onSelectPlan}
      />,
    );

    expect(
      screen.getByText("Failed to load pricing plans"),
    ).toBeInTheDocument();
  });
});
