import { openHands } from "./open-hands-axios";

// Types for subscription system
export interface Subscription {
  id: string;
  plan_id: string;
  plan_name: string;
  status: "trialing" | "active" | "cancelled" | "past_due" | "unpaid";
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  tokens_per_month: number;
}

export interface TokenBalance {
  subscription_tokens_available: number;
  subscription_tokens_total: number;
  topup_tokens_available: number;
  total_available: number;
  last_reset: string | null;
}

export interface UsageHistoryItem {
  id: string;
  timestamp: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  tokens_deducted: number;
  cost_cents: number;
  conversation_id: string | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  price_cents: number;
  tokens_per_month: number;
  features: Record<string, string | boolean | number>;
}

export interface CreateSubscriptionRequest {
  plan_id: string;
  team_id?: string;
  payment_method_id?: string;
}

export interface UpdateSubscriptionRequest {
  new_plan_id: string;
  proration_mode?: "immediate_credit" | "next_cycle" | "no_proration";
}

export interface CancelSubscriptionRequest {
  immediate?: boolean;
}

export interface CreateTopupRequest {
  amount: number; // Amount in dollars
}

export interface CheckoutResponse {
  checkout_url: string;
  session_id: string;
  tokens?: number; // For top-ups
}

export interface PortalResponse {
  portal_url: string;
}

export interface RateLimitStatus {
  action: string;
  limit: number;
  remaining: number;
  reset_at: string;
  window_hours: number;
  has_subscription?: boolean;
  daily_limit?: number;
  remaining_prompts?: number;
}

export interface TransactionHistory {
  id: string;
  user_id: string;
  transaction_type: string;
  description: string;
  amount_cents: number;
  tokens_amount: number;
  created_at: string;
  stripe_invoice_id?: string;
}

export interface PaymentMethod {
  id: string;
  type: "card" | "bank_account";
  last4: string;
  brand?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
}

export interface TeamAllocation {
  user_id: string;
  allocation_type: "unlimited" | "percentage" | "fixed" | "equal";
  allocation_value?: number;
  tokens_used_current_period: number;
}

// Extended subscription to include more fields
export interface SubscriptionExtended extends Subscription {
  plan_display_name: string;
  price_cents: number;
  billing_period: "monthly" | "yearly";
  proration_amount?: number;
}

class BillingAPI {
  // Subscription endpoints
  static async getSubscription(): Promise<Subscription | null> {
    const { data } = await openHands.get<{ subscription: Subscription | null }>(
      "/api/billing/subscription",
    );
    return data.subscription;
  }

  static async createSubscriptionCheckout(
    request: CreateSubscriptionRequest,
  ): Promise<CheckoutResponse> {
    const { data } = await openHands.post<CheckoutResponse>(
      "/api/billing/create-subscription-checkout",
      request,
    );
    return data;
  }

  static async updateSubscription(
    request: UpdateSubscriptionRequest,
  ): Promise<{ success: boolean; message: string }> {
    const { data } = await openHands.post<{
      success: boolean;
      message: string;
    }>("/api/billing/update-subscription", request);
    return data;
  }

  static async cancelSubscription(
    request: CancelSubscriptionRequest,
  ): Promise<{ success: boolean; message: string }> {
    const { data } = await openHands.post<{
      success: boolean;
      message: string;
    }>("/api/billing/cancel-subscription", request);
    return data;
  }

  // Token endpoints
  static async getTokenBalance(): Promise<TokenBalance> {
    const { data } = await openHands.get<TokenBalance>(
      "/api/billing/token-balance",
    );
    return data;
  }

  static async createTopupCheckout(
    request: CreateTopupRequest,
  ): Promise<CheckoutResponse> {
    const { data } = await openHands.post<CheckoutResponse>(
      "/api/billing/create-topup-checkout",
      request,
    );
    return data;
  }

  static async getUsageHistory(
    limit: number = 100,
    offset: number = 0,
  ): Promise<{ usage: UsageHistoryItem[]; total_count: number }> {
    const { data } = await openHands.get<{
      usage: UsageHistoryItem[];
      total_count: number;
    }>("/api/billing/usage-history", {
      params: { limit, offset },
    });
    return data;
  }

  // Plan endpoints
  static async getAvailablePlans(
    planType: "individual" | "team" = "individual",
    billingPeriod: "monthly" | "yearly" = "monthly",
  ): Promise<SubscriptionPlan[]> {
    const { data } = await openHands.get<{ plans: SubscriptionPlan[] }>(
      "/api/billing/plans",
      {
        params: {
          plan_type: planType,
          billing_period: billingPeriod,
        },
      },
    );
    return data.plans;
  }

  // Portal endpoint
  static async createManagePortalSession(): Promise<PortalResponse> {
    const { data } = await openHands.post<PortalResponse>(
      "/api/billing/manage-portal",
    );
    return data;
  }

  // Rate limit status
  static async getRateLimitStatus(): Promise<RateLimitStatus> {
    const { data } = await openHands.get<RateLimitStatus>(
      "/api/billing/rate-limit-status",
    );
    return data;
  }

  // Transaction history
  static async getTransactionHistory(options?: {
    limit?: number;
    offset?: number;
  }): Promise<TransactionHistory[]> {
    const { data } = await openHands.get<{
      transactions: TransactionHistory[];
    }>("/api/billing/transaction-history", {
      params: options,
    });
    return data.transactions;
  }

  // Payment methods
  static async getPaymentMethods(): Promise<PaymentMethod[]> {
    const { data } = await openHands.get<{ payment_methods: PaymentMethod[] }>(
      "/api/billing/payment-methods",
    );
    return data.payment_methods;
  }

  static async updateDefaultPaymentMethod(
    paymentMethodId: string,
  ): Promise<{ success: boolean; message: string }> {
    const { data } = await openHands.post<{
      success: boolean;
      message: string;
    }>("/api/billing/update-default-payment-method", {
      payment_method_id: paymentMethodId,
    });
    return data;
  }

  // Team allocation
  static async updateTeamMemberAllocation(
    teamId: string,
    userId: string,
    allocationType: "unlimited" | "percentage" | "fixed" | "equal",
    allocationValue?: number,
  ): Promise<{ success: boolean; message: string }> {
    const { data } = await openHands.post<{
      success: boolean;
      message: string;
    }>(`/api/billing/teams/${teamId}/allocations/${userId}`, {
      allocation_type: allocationType,
      allocation_value: allocationValue,
    });
    return data;
  }

  // Legacy endpoints for backward compatibility
  static async createCustomerSetupSession(): Promise<{
    redirect_url: string;
    session_id: string;
  }> {
    const { data } = await openHands.post<{
      redirect_url: string;
      session_id: string;
    }>("/api/billing/create-customer-setup-session");
    return data;
  }

  static async getBalance(): Promise<{
    balance: number;
    currency: string;
    subscription_active: boolean;
    credits_remaining: number;
  }> {
    const { data } = await openHands.get<{
      balance: number;
      currency: string;
      subscription_active: boolean;
      credits_remaining: number;
    }>("/api/billing/balance");
    return data;
  }

  static async createCheckoutSession(amount: number): Promise<{
    redirect_url: string;
    session_id: string;
  }> {
    const { data } = await openHands.post<{
      redirect_url: string;
      session_id: string;
    }>("/api/billing/create-checkout-session", { amount });
    return data;
  }

  static async completeBillingSetup(): Promise<{
    status: string;
    message: string;
  }> {
    const { data } = await openHands.post<{
      status: string;
      message: string;
    }>("/api/billing/complete-setup");
    return data;
  }
}

export default BillingAPI;

// Export convenience methods
export const {
  getSubscription,
  createSubscriptionCheckout,
  updateSubscription,
  cancelSubscription,
  getTokenBalance,
  createTopupCheckout,
  getUsageHistory,
  getAvailablePlans,
  createManagePortalSession,
  getRateLimitStatus,
  getTransactionHistory,
  getPaymentMethods,
  updateDefaultPaymentMethod,
  updateTeamMemberAllocation,
} = BillingAPI;
