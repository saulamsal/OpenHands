import React from "react";
import { useNavigate } from "react-router";
import {
  CalendarIcon,
  InfoCircledIcon,
  UpdateIcon,
} from "@radix-ui/react-icons";
import { CreditCard } from "lucide-react";
import { format } from "date-fns";
import { useSubscription } from "#/hooks/query/use-subscription";
import { useUsageHistory } from "#/hooks/query/use-usage-history";
import { useCancelSubscription } from "#/hooks/mutation/use-cancel-subscription";
import { useManagePortal } from "#/hooks/mutation/use-manage-portal";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Badge } from "#/components/ui/badge";
import { Skeleton } from "#/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "#/components/ui/alert-dialog";

interface SubscriptionManagementProps {
  isTeam?: boolean;
}

export function SubscriptionManagement({
  isTeam = false,
}: SubscriptionManagementProps) {
  const navigate = useNavigate();
  const { data: subscription, isLoading } = useSubscription();
  const { data: usage } = useUsageHistory({ limit: 5 });
  const { mutate: cancelSubscription, isPending: isCancelling } =
    useCancelSubscription();
  const { mutate: openPortal, isPending: isOpeningPortal } = useManagePortal();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Subscription</CardTitle>
          <CardDescription>
            Subscribe to unlock more tokens and advanced features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate("/pricing")}>View Plans</Button>
        </CardContent>
      </Card>
    );
  }

  const handleCancelSubscription = () => {
    cancelSubscription(
      { immediate: false },
      {
        onSuccess: () => {
          // Show success notification
        },
      },
    );
  };

  const handleOpenPortal = () => {
    openPortal(
      {},
      {
        onSuccess: (data) => {
          window.location.href = data.portal_url;
        },
      },
    );
  };

  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
          <CardDescription>
            Manage your subscription and billing details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Plan Details */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-semibold text-lg">
                {subscription.plan_display_name}
              </h4>
              <p className="text-sm text-gray-600">
                {formatAmount(subscription.price_cents)} /{" "}
                {subscription.billing_period}
              </p>
            </div>
            <div className="text-right">
              <Badge
                variant={
                  subscription.status === "active" ? "default" : "secondary"
                }
              >
                {subscription.status}
              </Badge>
              {subscription.cancel_at_period_end && (
                <p className="text-sm text-red-600 mt-1">
                  Cancels at period end
                </p>
              )}
            </div>
          </div>

          {/* Billing Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CalendarIcon className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Current Period</p>
                <p className="text-sm text-gray-600">
                  {format(
                    new Date(subscription.current_period_start),
                    "MMM d, yyyy",
                  )}{" "}
                  -
                  {format(
                    new Date(subscription.current_period_end),
                    "MMM d, yyyy",
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <UpdateIcon className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Next Billing Date</p>
                <p className="text-sm text-gray-600">
                  {format(
                    new Date(subscription.current_period_end),
                    "MMM d, yyyy",
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Token Allocation */}
          <div className="flex items-start gap-3">
            <InfoCircledIcon className="w-4 h-4 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Monthly Token Allocation</p>
              <p className="text-sm text-gray-600">
                {subscription.tokens_per_month.toLocaleString()} tokens
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleOpenPortal}
              disabled={isOpeningPortal}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Manage Billing
            </Button>
            <Button variant="outline" onClick={() => navigate("/pricing")}>
              Change Plan
            </Button>
            {!subscription.cancel_at_period_end && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isCancelling}>
                    Cancel Subscription
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your subscription will remain active until the end of the
                      current billing period. You can reactivate it anytime
                      before then.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelSubscription}>
                      Cancel Subscription
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Usage</CardTitle>
          <CardDescription>
            Your token usage over the last 5 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usage && usage.length > 0 ? (
            <div className="space-y-3">
              {usage.map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm text-gray-600">
                    {format(new Date(day.date), "MMM d, yyyy")}
                  </span>
                  <span className="font-medium">
                    {day.tokens_used.toLocaleString()} tokens
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No usage data available</p>
          )}
        </CardContent>
      </Card>

      {/* Proration Info */}
      {subscription.proration_amount && subscription.proration_amount > 0 && (
        <Alert>
          <InfoCircledIcon className="h-4 w-4" />
          <AlertTitle>Proration Credit</AlertTitle>
          <AlertDescription>
            You have a proration credit of{" "}
            {formatAmount(subscription.proration_amount)} from your previous
            plan change.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
