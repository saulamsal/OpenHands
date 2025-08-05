import { useSearchParams } from "react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { BillingDashboard } from "#/components/features/billing/billing-dashboard";
import { useRateLimitStatus } from "#/hooks/query/use-rate-limit-status";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Container } from "#/components/layout/container";
import {
  displayErrorToast,
  displaySuccessToast,
} from "#/utils/custom-toast-handlers";
import { I18nKey } from "#/i18n/declaration";

function BillingSettingsScreen() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");
  const { data: rateLimit } = useRateLimitStatus();

  React.useEffect(() => {
    if (checkoutStatus === "success") {
      displaySuccessToast(t(I18nKey.PAYMENT$SUCCESS));
    } else if (checkoutStatus === "cancel") {
      displayErrorToast(t(I18nKey.PAYMENT$CANCELLED));
    }

    setSearchParams({});
  }, [checkoutStatus]);

  return (
    <Container>
      <div className="py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
          <p className="text-gray-600">
            Manage your subscription, payment methods, and token usage
          </p>
        </div>

        {/* Rate Limit Alert for Free Users */}
        {rateLimit && !rateLimit.has_subscription && (
          <Alert className="mb-6">
            <InfoCircledIcon className="h-4 w-4" />
            <AlertTitle>Free Tier Limitations</AlertTitle>
            <AlertDescription>
              You're currently on the free tier with{" "}
              {rateLimit.remaining_prompts} of {rateLimit.daily_limit} prompts
              remaining today. Upgrade to remove limits and get more tokens.
            </AlertDescription>
          </Alert>
        )}

        <BillingDashboard />
      </div>
    </Container>
  );
}

export default BillingSettingsScreen;
