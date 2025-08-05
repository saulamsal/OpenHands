import React from "react";
import { useNavigate } from "react-router";
import { useTokenBalance } from "#/hooks/query/use-token-balance";
import { Button } from "#/components/ui/button";
import { Progress } from "#/components/ui/progress";
import { Skeleton } from "#/components/ui/skeleton";

export function TokenBalanceMini() {
  const navigate = useNavigate();
  const { data: balance, isLoading } = useTokenBalance();

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-2 w-full" />
      </div>
    );
  }

  if (!balance) return null;

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(0)}K`;
    }
    return num.toLocaleString();
  };

  const subscriptionPercentage =
    balance.subscription_tokens_total > 0
      ? (balance.subscription_tokens_available /
          balance.subscription_tokens_total) *
        100
      : 0;

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">Tokens</span>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => navigate("/billing")}
        >
          Manage
        </Button>
      </div>

      <div>
        <div className="text-2xl font-bold">
          {formatNumber(balance.total_available)}
        </div>
        {balance.subscription_tokens_total > 0 && (
          <Progress value={subscriptionPercentage} className="h-1.5 mt-2" />
        )}
      </div>

      {balance.total_available < 1000 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => navigate("/billing/topup")}
        >
          Add Tokens
        </Button>
      )}
    </div>
  );
}
