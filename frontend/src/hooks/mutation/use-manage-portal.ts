import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import BillingAPI, { PortalResponse } from "#/api/billing";

export function useManagePortal() {
  return useMutation<PortalResponse, Error>({
    mutationFn: () => BillingAPI.createManagePortalSession(),
    onSuccess: (data) => {
      // Redirect to Stripe customer portal
      if (data.portal_url) {
        window.location.href = data.portal_url;
      }
    },
    onError: (error) => {
      toast.error(`Failed to open billing portal: ${error.message}`);
    },
  });
}
