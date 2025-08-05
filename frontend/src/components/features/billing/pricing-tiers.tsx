import React from "react";
import { CheckIcon } from "@radix-ui/react-icons";
import { useAvailablePlans } from "#/hooks/query/use-available-plans";
import { useSubscription } from "#/hooks/query/use-subscription";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";

interface PricingTiersProps {
  type: "individual" | "team";
  period: "monthly" | "yearly";
  onSelectPlan: (planId: string) => void;
}

const PLAN_FEATURES = {
  basic: [
    "2,000,000 tokens/month",
    "All AI models",
    "Downloads & forks",
    "Community support",
  ],
  pro: [
    "5,000,000 tokens/month",
    "All AI models",
    "Priority support",
    "Advanced features",
    "Analytics dashboard",
  ],
  max: [
    "10,000,000 tokens/month",
    "All AI models",
    "Priority support",
    "Analytics dashboard",
    "API access",
    "Custom integrations",
  ],
  ultra: [
    "20,000,000 tokens/month",
    "All AI models",
    "Dedicated support",
    "Analytics dashboard",
    "API access",
    "Pay-as-you-go enabled",
    "Custom integrations",
  ],
};

export function PricingTiers({
  type,
  period,
  onSelectPlan,
}: PricingTiersProps) {
  const { data: plans, isLoading } = useAvailablePlans({
    planType: type,
    billingPeriod: period,
  });
  const { data: subscription } = useSubscription();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-[500px]">
            <CardHeader>
              <Skeleton className="h-6 w-20 mb-2" />
              <Skeleton className="h-8 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-full mb-4" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const sortedPlans =
    plans?.sort((a, b) => a.price_cents - b.price_cents) || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Free Tier */}
      <Card className="relative">
        <CardHeader>
          <CardTitle>Free</CardTitle>
          <CardDescription>Get started with OpenHands</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <span className="text-4xl font-bold">$0</span>
            <span className="text-gray-600">/month</span>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <CheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
              <span className="text-sm">50,000 tokens/month</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
              <span className="text-sm">2 prompts/day (IP limited)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
              <span className="text-sm">Basic models only</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
              <span className="text-sm">No downloads/forks</span>
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" disabled={!subscription}>
            Current Plan
          </Button>
        </CardFooter>
      </Card>

      {/* Paid Plans */}
      {sortedPlans.map((plan) => {
        const features =
          PLAN_FEATURES[plan.name as keyof typeof PLAN_FEATURES] || [];
        const isCurrentPlan = subscription?.plan_id === plan.id;
        const isPopular = plan.name === "pro";
        const monthlyPrice =
          period === "yearly"
            ? Math.round(plan.price_cents / 12)
            : plan.price_cents;

        return (
          <Card
            key={plan.id}
            className={`relative ${isPopular ? "border-blue-500 border-2" : ""}`}
          >
            {isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>
            )}
            <CardHeader>
              <CardTitle>{plan.display_name}</CardTitle>
              <CardDescription>
                {type === "team" ? "Per user/month" : "For individuals"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">
                  ${(monthlyPrice / 100).toFixed(0)}
                </span>
                <span className="text-gray-600">/month</span>
                {period === "yearly" && (
                  <div className="text-sm text-gray-500 mt-1">
                    ${(plan.price_cents / 100).toFixed(0)} billed annually
                  </div>
                )}
              </div>
              <ul className="space-y-3">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                variant={isPopular ? "default" : "outline"}
                className="w-full"
                onClick={() => onSelectPlan(plan.id)}
                disabled={isCurrentPlan}
              >
                {isCurrentPlan ? "Current Plan" : "Select Plan"}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
