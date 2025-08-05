import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import BillingAPI, { CancelSubscriptionRequest } from "#/api/billing";

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message: string },
    Error,
    CancelSubscriptionRequest
  >({
    mutationFn: (request) => BillingAPI.cancelSubscription(request),
    onSuccess: (data, variables) => {
      if (variables.immediate) {
        toast.success("Subscription cancelled immediately");
      } else {
        toast.success(
          "Subscription will be cancelled at the end of the billing period",
        );
      }
    },
    onError: (error) => {
      toast.error(`Failed to cancel subscription: ${error.message}`);
    },
    onSettled: () => {
      // Invalidate subscription query
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}
