import { useQuery } from "@tanstack/react-query";
import BillingAPI, { RateLimitStatus } from "#/api/billing";

export function useRateLimitStatus() {
  return useQuery<RateLimitStatus>({
    queryKey: ["rateLimitStatus"],
    queryFn: () => BillingAPI.getRateLimitStatus(),
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
}
