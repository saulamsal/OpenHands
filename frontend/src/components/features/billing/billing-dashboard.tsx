import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { SubscriptionManagement } from "./subscription-management";
import { TokenBalanceCard } from "./token-balance-card";
import { BillingHistory } from "./billing-history";
import { PaymentMethods } from "./payment-methods";
import { QuickTopup } from "./quick-topup";
import { TeamTokenAllocation } from "./team-allocation";
import { useTeam } from "#/hooks/use-team";

export function BillingDashboard() {
  const { activeTeam } = useTeam();
  const isTeamOwner = activeTeam?.role === "owner";

  return (
    <div className="space-y-6">
      {/* Token Balance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TokenBalanceCard />
        </div>
        <div>
          <QuickTopup />
        </div>
      </div>

      {/* Main Billing Tabs */}
      <Tabs defaultValue="subscription" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
          <TabsTrigger value="history">Billing History</TabsTrigger>
          {isTeamOwner && (
            <TabsTrigger value="team">Team Allocation</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="subscription" className="space-y-4">
          <SubscriptionManagement isTeam={!!activeTeam} />
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <PaymentMethods />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <BillingHistory />
        </TabsContent>

        {isTeamOwner && (
          <TabsContent value="team" className="space-y-4">
            <TeamTokenAllocation />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
