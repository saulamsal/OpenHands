import React from "react";
import { InfoCircledIcon, LightningBoltIcon } from "@radix-ui/react-icons";
import { useTopupTokens } from "#/hooks/mutation/use-topup-tokens";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Button } from "#/components/ui/button";
import { Badge } from "#/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { Label } from "#/components/ui/label";
import { Alert, AlertDescription } from "#/components/ui/alert";

const TOPUP_OPTIONS = [
  { tokens: 1_000_000, price: 8, label: "1M tokens", popular: false },
  { tokens: 5_000_000, price: 40, label: "5M tokens", popular: true },
  { tokens: 10_000_000, price: 80, label: "10M tokens", popular: false },
  { tokens: 50_000_000, price: 400, label: "50M tokens", popular: false },
];

export function QuickTopup() {
  const { mutate: topupTokens, isPending } = useTopupTokens();
  const [selectedOption, setSelectedOption] = React.useState("5000000");

  const handlePurchase = () => {
    const option = TOPUP_OPTIONS.find(
      (opt) => opt.tokens.toString() === selectedOption,
    );
    if (option) {
      topupTokens(
        { amount: option.price },
        {
          onSuccess: (data) => {
            if (data.checkout_url) {
              window.location.href = data.checkout_url;
            }
          },
        },
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LightningBoltIcon className="w-5 h-5" />
          Quick Token Top-up
        </CardTitle>
        <CardDescription>
          Purchase additional tokens that never expire
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <InfoCircledIcon className="h-4 w-4" />
          <AlertDescription>
            Top-up tokens are priced at $8 per million tokens (60% premium over
            subscription tokens) and never expire. They're used after your
            subscription tokens are depleted.
          </AlertDescription>
        </Alert>

        <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TOPUP_OPTIONS.map((option) => (
              <div key={option.tokens} className="relative">
                {option.popular && (
                  <Badge
                    className="absolute -top-2 -right-2 z-10"
                    variant="default"
                  >
                    Popular
                  </Badge>
                )}
                <div
                  className={`border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedOption === option.tokens.toString()
                      ? "border-blue-500 bg-blue-50"
                      : ""
                  }`}
                >
                  <RadioGroupItem
                    value={option.tokens.toString()}
                    id={option.tokens.toString()}
                    className="sr-only"
                  />
                  <Label
                    htmlFor={option.tokens.toString()}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{option.label}</p>
                        <p className="text-sm text-gray-500">
                          $
                          {((option.price / option.tokens) * 1_000_000).toFixed(
                            2,
                          )}{" "}
                          per million
                        </p>
                      </div>
                      <p className="text-2xl font-bold">${option.price}</p>
                    </div>
                  </Label>
                </div>
              </div>
            ))}
          </div>
        </RadioGroup>

        <Button
          className="w-full"
          size="lg"
          onClick={handlePurchase}
          disabled={isPending}
        >
          {isPending ? "Processing..." : "Purchase Tokens"}
        </Button>

        <div className="text-center text-sm text-gray-500">
          <p>Secure payment via Stripe</p>
          <p>Instant token delivery • Cancel anytime</p>
        </div>
      </CardContent>
    </Card>
  );
}
