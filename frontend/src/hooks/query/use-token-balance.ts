import { useQuery } from "@tanstack/react-query";
import BillingAPI, { TokenBalance } from "#/api/billing";

export function useTokenBalance() {
  return useQuery<TokenBalance>({
    queryKey: ["tokenBalance"],
    queryFn: () => BillingAPI.getTokenBalance(),
    staleTime: 1000 * 30, // 30 seconds - refresh frequently
    refetchInterval: 1000 * 60, // Refetch every minute
    refetchOnWindowFocus: true,
  });
}
