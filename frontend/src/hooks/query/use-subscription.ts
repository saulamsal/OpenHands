import { useQuery } from "@tanstack/react-query";
import BillingAPI, { SubscriptionExtended } from "#/api/billing";

export function useSubscription() {
  return useQuery<SubscriptionExtended | null>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const subscription = await BillingAPI.getSubscription();
      // Cast to extended subscription for components that need extra fields
      return subscription as SubscriptionExtended | null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
