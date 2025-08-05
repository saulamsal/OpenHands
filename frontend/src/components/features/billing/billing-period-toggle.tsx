import React from "react";

interface BillingPeriodToggleProps {
  value: "monthly" | "yearly";
  onValueChange: (value: "monthly" | "yearly") => void;
}

export function BillingPeriodToggle({
  value,
  onValueChange,
}: BillingPeriodToggleProps) {
  return (
    <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
      <button
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          value === "monthly"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
        onClick={() => onValueChange("monthly")}
      >
        Monthly
      </button>
      <button
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          value === "yearly"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
        onClick={() => onValueChange("yearly")}
      >
        Yearly
      </button>
    </div>
  );
}
