import React from "react";
import { format } from "date-fns";
import { DownloadIcon } from "@radix-ui/react-icons";
import { useTransactionHistory } from "#/hooks/query/use-transaction-history";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Badge } from "#/components/ui/badge";
import { Skeleton } from "#/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { Button } from "#/components/ui/button";

export function BillingHistory() {
  const { data: transactions, isLoading } = useTransactionHistory({
    limit: 50,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const getTransactionTypeBadge = (type: string) => {
    const variants: Record<string, any> = {
      subscription_payment: "default",
      topup_purchase: "secondary",
      subscription_grant: "outline",
      refund: "destructive",
    };

    const labels: Record<string, string> = {
      subscription_payment: "Subscription",
      topup_purchase: "Top-up",
      subscription_grant: "Token Grant",
      refund: "Refund",
    };

    return (
      <Badge variant={variants[type] || "outline"}>
        {labels[type] || type}
      </Badge>
    );
  };

  const handleDownloadInvoice = async (transactionId: string) => {
    // TODO: Implement invoice download
    console.log("Download invoice for", transactionId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing History</CardTitle>
        <CardDescription>
          View your past transactions and download invoices
        </CardDescription>
      </CardHeader>
      <CardContent>
        {transactions && transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(transaction.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {getTransactionTypeBadge(transaction.transaction_type)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {transaction.description}
                    </TableCell>
                    <TableCell>
                      {transaction.tokens_amount > 0 && (
                        <span className="text-green-600">
                          +{transaction.tokens_amount.toLocaleString()}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.amount_cents > 0 &&
                        formatAmount(transaction.amount_cents)}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.stripe_invoice_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(transaction.id)}
                        >
                          <DownloadIcon className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">
            No billing history available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
