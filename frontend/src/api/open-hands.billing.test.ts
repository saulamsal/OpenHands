import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { OpenHandsApiClient } from "./open-hands";

// Mock axios
vi.mock("axios");

describe("OpenHandsApiClient - Billing Methods", () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any);
  });

  describe("getSubscriptionPlans", () => {
    it("fetches subscription plans successfully", async () => {
      const mockPlans = [
        {
          id: "plan_basic",
          name: "basic",
          display_name: "Basic Plan",
          price_cents: 1000,
          tokens_per_month: 2000000,
        },
        {
          id: "plan_pro",
          name: "pro",
          display_name: "Pro Plan",
          price_cents: 2000,
          tokens_per_month: 5000000,
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockPlans });

      const result = await OpenHandsApiClient.getSubscriptionPlans({
        type: "individual",
        period: "monthly",
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/api/billing/plans", {
        params: {
          type: "individual",
          period: "monthly",
        },
      });
      expect(result).toEqual(mockPlans);
    });

    it("handles error when fetching plans", async () => {
      const error = new Error("Network error");
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(
        OpenHandsApiClient.getSubscriptionPlans({
          type: "individual",
          period: "monthly",
        }),
      ).rejects.toThrow("Network error");
    });
  });

  describe("getSubscriptionStatus", () => {
    it("fetches subscription status successfully", async () => {
      const mockSubscription = {
        subscription: {
          id: "sub_123",
          status: "active",
          plan: {
            id: "plan_pro",
            name: "pro",
            display_name: "Pro Plan",
          },
          current_period_end: "2024-01-31T23:59:59Z",
        },
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockSubscription });

      const result = await OpenHandsApiClient.getSubscriptionStatus();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/api/billing/subscription",
      );
      expect(result).toEqual(mockSubscription);
    });

    it("handles no subscription (free tier)", async () => {
      const mockResponse = {
        subscription: null,
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await OpenHandsApiClient.getSubscriptionStatus();

      expect(result.subscription).toBeNull();
    });
  });

  describe("createSubscription", () => {
    it("creates subscription successfully", async () => {
      const mockResponse = {
        subscription_id: "sub_123",
        status: "active",
        client_secret: "seti_123_secret",
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await OpenHandsApiClient.createSubscription({
        planId: "plan_pro",
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/api/billing/subscription",
        { plan_id: "plan_pro" },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateSubscription", () => {
    it("updates subscription plan successfully", async () => {
      const mockResponse = {
        message: "Subscription updated successfully",
        subscription: {
          id: "sub_123",
          plan_id: "plan_pro",
        },
      };

      mockAxiosInstance.put.mockResolvedValue({ data: mockResponse });

      const result = await OpenHandsApiClient.updateSubscription({
        subscriptionId: "sub_123",
        newPlanId: "plan_pro",
        prorationMode: "immediate_credit",
      });

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        "/api/billing/subscription/sub_123",
        {
          new_plan_id: "plan_pro",
          proration_mode: "immediate_credit",
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("cancelSubscription", () => {
    it("cancels subscription successfully", async () => {
      const mockResponse = {
        message: "Subscription cancelled successfully",
        subscription: {
          id: "sub_123",
          status: "cancelled",
        },
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await OpenHandsApiClient.cancelSubscription({
        subscriptionId: "sub_123",
        immediate: false,
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/api/billing/subscription/sub_123/cancel",
        { immediate: false },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getTokenBalance", () => {
    it("fetches token balance successfully", async () => {
      const mockBalance = {
        subscription_tokens_available: 1500000,
        topup_tokens_available: 250000,
        free_tier_tokens_available: 0,
        total_available: 1750000,
        last_reset: "2024-01-01T00:00:00Z",
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockBalance });

      const result = await OpenHandsApiClient.getTokenBalance();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/api/billing/tokens/balance",
      );
      expect(result).toEqual(mockBalance);
    });
  });

  describe("purchaseTokens", () => {
    it("purchases tokens successfully", async () => {
      const mockResponse = {
        payment_intent_id: "pi_123",
        client_secret: "pi_123_secret",
        amount_tokens: 1000000,
        amount_cents: 800,
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await OpenHandsApiClient.purchaseTokens({
        amount: 1000000,
        paymentMethodId: "pm_123",
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/api/billing/tokens/purchase",
        {
          amount: 1000000,
          payment_method_id: "pm_123",
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getUsageHistory", () => {
    it("fetches usage history successfully", async () => {
      const mockUsage = [
        {
          timestamp: "2024-01-01T10:00:00Z",
          model: "gpt-4",
          tokens_deducted: 150,
          cost_cents: 30,
        },
        {
          timestamp: "2024-01-01T11:00:00Z",
          model: "gpt-3.5-turbo",
          tokens_deducted: 300,
          cost_cents: 15,
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockUsage });

      const result = await OpenHandsApiClient.getUsageHistory({
        limit: 10,
        offset: 0,
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/api/billing/tokens/usage",
        {
          params: {
            limit: 10,
            offset: 0,
          },
        },
      );
      expect(result).toEqual(mockUsage);
    });
  });

  describe("getPaymentMethods", () => {
    it("fetches payment methods successfully", async () => {
      const mockPaymentMethods = [
        {
          id: "pm_123",
          type: "card",
          card: {
            brand: "visa",
            last4: "4242",
            exp_month: 12,
            exp_year: 2025,
          },
          is_default: true,
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockPaymentMethods });

      const result = await OpenHandsApiClient.getPaymentMethods();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/api/billing/payment-methods",
      );
      expect(result).toEqual(mockPaymentMethods);
    });
  });

  describe("addPaymentMethod", () => {
    it("adds payment method successfully", async () => {
      const mockResponse = {
        payment_method_id: "pm_new123",
        message: "Payment method added successfully",
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await OpenHandsApiClient.addPaymentMethod({
        paymentMethodId: "pm_new123",
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/api/billing/payment-methods",
        {
          payment_method_id: "pm_new123",
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("removePaymentMethod", () => {
    it("removes payment method successfully", async () => {
      const mockResponse = {
        message: "Payment method removed successfully",
      };

      mockAxiosInstance.delete.mockResolvedValue({ data: mockResponse });

      const result = await OpenHandsApiClient.removePaymentMethod({
        paymentMethodId: "pm_123",
      });

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        "/api/billing/payment-methods/pm_123",
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("createCheckoutSession", () => {
    it("creates checkout session successfully", async () => {
      const mockResponse = {
        session_id: "cs_test123",
        checkout_url: "https://checkout.stripe.com/test123",
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await OpenHandsApiClient.createCheckoutSession({
        planId: "plan_pro",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/api/billing/checkout/session",
        {
          plan_id: "plan_pro",
          success_url: "https://example.com/success",
          cancel_url: "https://example.com/cancel",
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("createBillingPortalSession", () => {
    it("creates billing portal session successfully", async () => {
      const mockResponse = {
        portal_url: "https://billing.stripe.com/test123",
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await OpenHandsApiClient.createBillingPortalSession({
        returnUrl: "https://example.com/account",
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/api/billing/portal/session",
        {
          return_url: "https://example.com/account",
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getRateLimitStatus", () => {
    it("fetches rate limit status successfully", async () => {
      const mockStatus = {
        action: "create_conversation",
        limit: 2,
        remaining: 1,
        reset_at: "2024-01-02T00:00:00Z",
        window_hours: 24,
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockStatus });

      const result = await OpenHandsApiClient.getRateLimitStatus({
        action: "create_conversation",
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/api/billing/rate-limit",
        {
          params: {
            action: "create_conversation",
          },
        },
      );
      expect(result).toEqual(mockStatus);
    });
  });

  describe("error handling", () => {
    it("handles 401 unauthorized errors", async () => {
      const error = {
        response: {
          status: 401,
          data: { detail: "Unauthorized" },
        },
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(OpenHandsApiClient.getTokenBalance()).rejects.toMatchObject({
        response: {
          status: 401,
        },
      });
    });

    it("handles 404 not found errors", async () => {
      const error = {
        response: {
          status: 404,
          data: { detail: "Subscription not found" },
        },
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(
        OpenHandsApiClient.getSubscriptionStatus(),
      ).rejects.toMatchObject({
        response: {
          status: 404,
        },
      });
    });

    it("handles network errors", async () => {
      const error = new Error("Network Error");
      error.code = "ECONNABORTED";
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(OpenHandsApiClient.getTokenBalance()).rejects.toThrow(
        "Network Error",
      );
    });
  });
});
