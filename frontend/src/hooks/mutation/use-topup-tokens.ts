import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import BillingAPI, {
  CreateTopupRequest,
  CheckoutResponse,
} from "#/api/billing";

export function useTopupTokens() {
  const queryClient = useQueryClient();

  return useMutation<CheckoutResponse, Error, CreateTopupRequest>({
    mutationFn: (request) => BillingAPI.createTopupCheckout(request),
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    },
    onError: (error) => {
      toast.error(`Failed to create top-up checkout: ${error.message}`);
    },
    onSettled: () => {
      // Invalidate balance query
      queryClient.invalidateQueries({ queryKey: ["tokenBalance"] });
    },
  });
}
