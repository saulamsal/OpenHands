import React from "react";
import { useTranslation } from "react-i18next";
import { BaseModal } from "./base-modal/base-modal";

import { Label } from "#/components/ui/label";
import { InteractionMode } from "../mode-selector";

interface ModeSelectionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: InteractionMode;
  agenticQaTest: boolean;
  onModeChange: (mode: InteractionMode) => void;
  onAgenticQaTestChange: (enabled: boolean) => void;
}

export function ModeSelectionModal({
  isOpen,
  onOpenChange,
  mode,
  agenticQaTest,
  onModeChange,
  onAgenticQaTestChange,
}: ModeSelectionModalProps) {
  const { t } = useTranslation();

  return (
    <BaseModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t("Select Interaction Mode")}
    >
      <div className="p-4">
        <div className="space-y-4">
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => onModeChange("AGENTIC")}
          >
            <div
              className={`w-4 h-4 rounded-full border border-gray-400 ${mode === "AGENTIC" ? "bg-blue-600" : ""}`}
            />
            <Label htmlFor="agentic">{t("Agentic")}</Label>
          </div>
          {mode === "AGENTIC" && (
            <div className="pl-6 pt-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="agentic-qa-test"
                  checked={agenticQaTest}
                  onChange={(e) => onAgenticQaTestChange(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                />
                <Label htmlFor="agentic-qa-test">
                  {t("Agentic QA & Test")}
                </Label>
              </div>
            </div>
          )}
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => onModeChange("CHAT")}
          >
            <div
              className={`w-4 h-4 rounded-full border border-gray-400 ${mode === "CHAT" ? "bg-blue-600" : ""}`}
            />
            <Label htmlFor="chat">{t("Chat")}</Label>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
