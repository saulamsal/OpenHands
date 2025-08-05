import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import BillingAPI, { UpdateSubscriptionRequest } from "#/api/billing";

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, UpdateSubscriptionRequest>({
    mutationFn: (request) => BillingAPI.updateSubscription(request),
    onSuccess: (data) => {
      toast.success("Subscription updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update subscription: ${error.message}`);
    },
    onSettled: () => {
      // Invalidate subscription and balance queries
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["tokenBalance"] });
    },
  });
}
