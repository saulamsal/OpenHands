import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateDefaultPaymentMethod } from "#/api/billing";
import { useToast } from "#/hooks/use-toast";

export function useUpdatePaymentMethod() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentMethodId }: { paymentMethodId: string }) =>
      updateDefaultPaymentMethod(paymentMethodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({
        title: "Default payment method updated",
        description:
          "Your default payment method has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating payment method",
        description: error.message || "Failed to update default payment method",
        variant: "destructive",
      });
    },
  });
}
