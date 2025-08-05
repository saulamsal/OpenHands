import { useQuery } from "@tanstack/react-query";
import { getPaymentMethods } from "#/api/billing";

export function usePaymentMethods() {
  return useQuery({
    queryKey: ["payment-methods"],
    queryFn: getPaymentMethods,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
