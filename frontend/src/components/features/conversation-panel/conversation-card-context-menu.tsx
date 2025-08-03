import { useTranslation } from "react-i18next";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "#/components/ui/dropdown-menu";
import { I18nKey } from "#/i18n/declaration";

interface ConversationCardContextMenuProps {
  onClose: () => void;
  onDelete?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onStop?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onEdit?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDisplayCost?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onShowAgentTools?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onShowMicroagents?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDownloadViaVSCode?: (event: React.MouseEvent<HTMLDivElement>) => void;
  position?: "top" | "bottom";
}

export function ConversationCardContextMenu({
  onClose,
  onDelete,
  onStop,
  onEdit,
  onDisplayCost,
  onShowAgentTools,
  onShowMicroagents,
  onDownloadViaVSCode,
  position = "bottom",
}: ConversationCardContextMenuProps) {
  const { t } = useTranslation();

  return (
    <DropdownMenuContent
      align="end"
      className="w-64"
      onInteractOutside={onClose}
    >
      {onEdit && (
        <DropdownMenuItem onClick={onEdit}>
          {t(I18nKey.BUTTON$EDIT_TITLE)}
        </DropdownMenuItem>
      )}
      {onDownloadViaVSCode && (
        <DropdownMenuItem onClick={onDownloadViaVSCode}>
          {t(I18nKey.BUTTON$DOWNLOAD_VIA_VSCODE)}
        </DropdownMenuItem>
      )}
      {(onEdit || onDownloadViaVSCode) &&
        (onDisplayCost ||
          onShowAgentTools ||
          onShowMicroagents ||
          onStop ||
          onDelete) && <DropdownMenuSeparator />}
      {onDisplayCost && (
        <DropdownMenuItem onClick={onDisplayCost}>
          {t(I18nKey.BUTTON$DISPLAY_COST)}
        </DropdownMenuItem>
      )}
      {onShowAgentTools && (
        <DropdownMenuItem onClick={onShowAgentTools}>
          {t(I18nKey.BUTTON$SHOW_AGENT_TOOLS_AND_METADATA)}
        </DropdownMenuItem>
      )}
      {onShowMicroagents && (
        <DropdownMenuItem onClick={onShowMicroagents}>
          {t(I18nKey.CONVERSATION$SHOW_MICROAGENTS)}
        </DropdownMenuItem>
      )}
      {(onDisplayCost || onShowAgentTools || onShowMicroagents) &&
        (onStop || onDelete) && <DropdownMenuSeparator />}
      {onStop && (
        <DropdownMenuItem onClick={onStop}>
          {t(I18nKey.BUTTON$STOP)}
        </DropdownMenuItem>
      )}
      {onDelete && (
        <DropdownMenuItem onClick={onDelete} className="text-destructive">
          {t(I18nKey.BUTTON$DELETE)}
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  );
}
