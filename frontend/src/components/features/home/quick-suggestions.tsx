import React from "react";
import { cn } from "#/utils/utils";

interface QuickSuggestionsProps {
  onSuggestionClick: (suggestion: string) => void;
  disabled?: boolean;
}

const quickSuggestions = [
  "Write documentation",
  "Optimize performance",
  "Find and fix 3 bugs",
];

export function QuickSuggestions({
  onSuggestionClick,
  disabled,
}: QuickSuggestionsProps) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {quickSuggestions.map((suggestion, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSuggestionClick(suggestion)}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 cursor-pointer",
            "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            disabled &&
              "opacity-50 cursor-not-allowed hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600",
          )}
        >
          <span className="text-gray-500 dark:text-gray-400">
            {index === 0 && "📝"}
            {index === 1 && "⚡️"}
            {index === 2 && "🐛"}
          </span>
          {suggestion}
        </button>
      ))}
    </div>
  );
}
