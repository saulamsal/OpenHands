import React from "react";
import { FaListUl } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router";
import { I18nKey } from "#/i18n/declaration";
import { TooltipButton } from "./tooltip-button";
import { cn } from "#/utils/utils";

interface ConversationsButtonProps {
  disabled?: boolean;
}

export function ConversationsButton({
  disabled = false,
}: ConversationsButtonProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = location.pathname === "/conversations";

  return (
    <TooltipButton
      testId="go-to-conversations"
      tooltip={t(I18nKey.SIDEBAR$CONVERSATIONS)}
      ariaLabel={t(I18nKey.SIDEBAR$CONVERSATIONS)}
      onClick={() => navigate("/conversations")}
      disabled={disabled}
    >
      <FaListUl
        size={22}
        className={cn(
          "cursor-pointer",
          isActive ? "text-white" : "text-[#9099AC]",
          disabled && "opacity-50",
        )}
      />
    </TooltipButton>
  );
}
