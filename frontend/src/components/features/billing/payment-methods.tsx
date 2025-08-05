import React from "react";
import { PlusIcon } from "@radix-ui/react-icons";
import { CreditCard } from "lucide-react";
import { usePaymentMethods } from "#/hooks/query/use-payment-methods";
import { useUpdatePaymentMethod } from "#/hooks/mutation/use-update-payment-method";
import { useManagePortal } from "#/hooks/mutation/use-manage-portal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Button } from "#/components/ui/button";
import { Badge } from "#/components/ui/badge";
import { Skeleton } from "#/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { Label } from "#/components/ui/label";

interface PaymentMethod {
  id: string;
  type: "card" | "bank_account";
  last4: string;
  brand?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
}

export function PaymentMethods() {
  const { data: paymentMethods, isLoading } = usePaymentMethods();
  const { mutate: updateDefault, isPending: isUpdating } =
    useUpdatePaymentMethod();
  const { mutate: openPortal, isPending: isOpeningPortal } = useManagePortal();

  const [selectedMethod, setSelectedMethod] = React.useState<string>("");

  React.useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0) {
      const defaultMethod = paymentMethods.find((m) => m.is_default);
      if (defaultMethod) {
        setSelectedMethod(defaultMethod.id);
      }
    }
  }, [paymentMethods]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSetDefault = () => {
    if (
      selectedMethod &&
      selectedMethod !== paymentMethods?.find((m) => m.is_default)?.id
    ) {
      updateDefault({ paymentMethodId: selectedMethod });
    }
  };

  const handleAddPaymentMethod = () => {
    openPortal(
      {},
      {
        onSuccess: (data) => {
          window.location.href = data.portal_url;
        },
      },
    );
  };

  const formatCardBrand = (brand?: string) => {
    if (!brand) return "Card";
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
        <CardDescription>
          Manage your payment methods and set a default for subscriptions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentMethods && paymentMethods.length > 0 ? (
          <>
            <RadioGroup
              value={selectedMethod}
              onValueChange={setSelectedMethod}
            >
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <RadioGroupItem value={method.id} id={method.id} />
                  <Label
                    htmlFor={method.id}
                    className="flex-1 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium">
                          {formatCardBrand(method.brand)} •••• {method.last4}
                        </p>
                        {method.exp_month && method.exp_year && (
                          <p className="text-sm text-gray-500">
                            Expires {method.exp_month}/{method.exp_year}
                          </p>
                        )}
                      </div>
                    </div>
                    {method.is_default && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSetDefault}
                disabled={
                  isUpdating ||
                  selectedMethod ===
                    paymentMethods.find((m) => m.is_default)?.id
                }
              >
                Set as Default
              </Button>
              <Button
                variant="outline"
                onClick={handleAddPaymentMethod}
                disabled={isOpeningPortal}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-500 mb-4">
              No payment methods on file
            </p>
            <Button onClick={handleAddPaymentMethod} disabled={isOpeningPortal}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
