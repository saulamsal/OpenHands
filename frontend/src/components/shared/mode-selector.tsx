import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "#/components/ui/dropdown-menu";
import { Button } from "#/components/ui/button";

export type InteractionMode = "AGENTIC" | "CHAT";

interface ModeSelectorProps {
  mode: InteractionMode;
  agenticQaTest: boolean;
  onModeChange: (mode: InteractionMode) => void;
  onAgenticQaTestChange: (enabled: boolean) => void;
}

export function ModeSelector({
  mode,
  agenticQaTest,
  onModeChange,
  onAgenticQaTestChange,
}: ModeSelectorProps) {
  const { t } = useTranslation();

  const modes = [
    { key: "AGENTIC", label: "Agentic" },
    { key: "CHAT", label: "Chat" },
  ];

  const currentMode = modes.find((m) => m.key === mode) || modes[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <span>{t(currentMode.label)}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => onModeChange("AGENTIC")}>
          <span className="flex-grow">{t("Agentic")}</span>
          {mode === "AGENTIC" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onModeChange("CHAT")}>
          <span className="flex-grow">{t("Chat")}</span>
          {mode === "CHAT" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        {mode === "AGENTIC" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onAgenticQaTestChange(!agenticQaTest)}
            >
              <span className="flex-grow">{t("Agentic QA & Test")}</span>
              {agenticQaTest && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
