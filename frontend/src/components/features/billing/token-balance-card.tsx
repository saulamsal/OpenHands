import React from "react";
import { useNavigate } from "react-router";
import { InfoCircledIcon, UpdateIcon } from "@radix-ui/react-icons";
import { useTokenBalance } from "#/hooks/query/use-token-balance";
import { useSubscription } from "#/hooks/query/use-subscription";
import { Button } from "#/components/ui/button";
import { Progress } from "#/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "#/components/ui/tooltip";

export function TokenBalanceCard() {
  const navigate = useNavigate();
  const { data: balance, isLoading: balanceLoading } = useTokenBalance();
  const { data: subscription } = useSubscription();

  if (balanceLoading || !balance) return null;

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const subscriptionPercentageUsed = subscription
    ? ((subscription.tokens_per_month - balance.subscription_tokens_available) /
        subscription.tokens_per_month) *
      100
    : 0;

  const daysUntilReset = subscription
    ? Math.ceil(
        (new Date(subscription.current_period_end).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold flex items-center gap-2">
          Token Balance
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoCircledIcon className="w-4 h-4 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Tokens are used for AI model interactions. Subscription tokens
                  reset monthly, top-up tokens never expire.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </h4>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate("/billing/topup")}
        >
          Add Tokens
        </Button>
      </div>

      <div className="text-4xl font-bold mb-4">
        {formatNumber(balance.total_available)}
        <span className="text-lg font-normal ml-2">tokens</span>
      </div>

      {subscription && (
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Subscription Tokens</span>
              <span>
                {formatNumber(balance.subscription_tokens_available)} /
                {formatNumber(balance.subscription_tokens_total)}
              </span>
            </div>
            <Progress
              value={100 - subscriptionPercentageUsed}
              className="h-2 bg-white/20"
            />
            <p className="text-xs mt-1 opacity-80 flex items-center gap-1">
              <UpdateIcon className="w-3 h-3" />
              Resets in {daysUntilReset} days
            </p>
          </div>

          {balance.topup_tokens_available > 0 && (
            <div className="pt-2 border-t border-white/20">
              <div className="flex justify-between text-sm">
                <span>Top-up Tokens (never expire)</span>
                <span>{formatNumber(balance.topup_tokens_available)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {!subscription && (
        <div className="flex items-center gap-2 mt-3 text-sm">
          <UpdateIcon className="w-4 h-4" />
          <Button
            variant="link"
            className="text-white underline p-0 h-auto"
            onClick={() => navigate("/pricing")}
          >
            Upgrade for more tokens
          </Button>
        </div>
      )}
    </div>
  );
}
