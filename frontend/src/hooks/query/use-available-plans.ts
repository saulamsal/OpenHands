import { useQuery } from "@tanstack/react-query";
import BillingAPI, { SubscriptionPlan } from "#/api/billing";

interface UseAvailablePlansParams {
  planType?: "individual" | "team";
  billingPeriod?: "monthly" | "yearly";
}

export function useAvailablePlans({
  planType = "individual",
  billingPeriod = "monthly",
}: UseAvailablePlansParams = {}) {
  return useQuery<SubscriptionPlan[]>({
    queryKey: ["availablePlans", planType, billingPeriod],
    queryFn: () => BillingAPI.getAvailablePlans(planType, billingPeriod),
    staleTime: 1000 * 60 * 60, // 1 hour - plans don't change often
  });
}
