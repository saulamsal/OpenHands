import { useQuery } from "@tanstack/react-query";
import { getTransactionHistory } from "#/api/billing";

interface UseTransactionHistoryOptions {
  limit?: number;
  offset?: number;
}

export function useTransactionHistory(options?: UseTransactionHistoryOptions) {
  return useQuery({
    queryKey: ["transaction-history", options],
    queryFn: () => getTransactionHistory(options),
    refetchInterval: 60000, // Refetch every minute
  });
}
