import React from "react";
import { useNavigate } from "react-router";
import { useAuth } from "#/hooks/use-auth";
import { PricingTiers } from "#/components/features/billing/pricing-tiers";
import { SegmentedControl } from "#/components/shared/segmented-control";
import { BillingPeriodToggle } from "#/components/features/billing/billing-period-toggle";

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = React.useState<
    "monthly" | "yearly"
  >("monthly");
  const [planType, setPlanType] = React.useState<"personal" | "team">(
    "personal",
  );
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleSelectPlan = (planId: string) => {
    if (!isAuthenticated) {
      navigate("/login?redirect=/pricing");
      return;
    }

    // Include billing period in plan selection
    const fullPlanId = `${planId}_${billingPeriod}`;
    navigate(`/billing/checkout?plan=${fullPlanId}&type=${planType}`);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-lg text-gray-600 mb-8">
          Start for free. Upgrade as you grow.
        </p>

        <div className="flex justify-center gap-8 mb-8">
          <SegmentedControl
            value={planType}
            onValueChange={setPlanType as (value: string) => void}
            options={[
              { value: "personal", label: "Personal" },
              { value: "team", label: "Team" },
            ]}
          />

          <BillingPeriodToggle
            value={billingPeriod}
            onValueChange={setBillingPeriod}
          />
        </div>

        {billingPeriod === "yearly" && (
          <p className="text-sm text-green-600 font-medium mb-4">
            Save 20% with annual billing
          </p>
        )}
      </div>

      <PricingTiers
        type={planType === "personal" ? "individual" : "team"}
        period={billingPeriod}
        onSelectPlan={handleSelectPlan}
      />

      <div className="mt-12 text-center text-sm text-gray-500">
        <p>All plans include a 14-day money-back guarantee</p>
        <p className="mt-2">
          Need a custom plan?{" "}
          <a href="/contact" className="text-blue-600 hover:underline">
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
}
