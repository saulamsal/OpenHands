import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import BillingAPI, {
  CreateSubscriptionRequest,
  CheckoutResponse,
} from "#/api/billing";

export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation<CheckoutResponse, Error, CreateSubscriptionRequest>({
    mutationFn: (request) => BillingAPI.createSubscriptionCheckout(request),
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    },
    onError: (error) => {
      toast.error(`Failed to create subscription checkout: ${error.message}`);
    },
    onSettled: () => {
      // Invalidate subscription and balance queries
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["tokenBalance"] });
    },
  });
}
