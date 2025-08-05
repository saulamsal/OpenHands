import { useQuery } from "@tanstack/react-query";
import BillingAPI, { UsageHistoryItem } from "#/api/billing";

interface UseUsageHistoryParams {
  limit?: number;
  offset?: number;
}

export function useUsageHistory({
  limit = 100,
  offset = 0,
}: UseUsageHistoryParams = {}) {
  return useQuery<{ usage: UsageHistoryItem[]; total_count: number }>({
    queryKey: ["usageHistory", limit, offset],
    queryFn: () => BillingAPI.getUsageHistory(limit, offset),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
