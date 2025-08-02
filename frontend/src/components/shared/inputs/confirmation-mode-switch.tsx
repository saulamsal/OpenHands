import { Switch } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";

interface ConfirmationModeSwitchProps {
  isDisabled: boolean;
  defaultSelected: boolean;
}

export function ConfirmationModeSwitch({
  isDisabled,
  defaultSelected,
}: ConfirmationModeSwitchProps) {
  const { t } = useTranslation();

  return (
    <Switch
      isDisabled={isDisabled}
      name="confirmation-mode"
      defaultSelected={defaultSelected}
      classNames={{
        thumb: cn(
          "bg-muted-foreground w-3 h-3",
          "group-data-[selected=true]:bg-primary-foreground",
        ),
        wrapper: cn(
          "border bg-background px-[6px] w-12 h-6",
          "group-data-[selected=true]:border-transparent group-data-[selected=true]:bg-primary",
        ),
        label: "text-muted-foreground text-xs",
      }}
    >
      {t(I18nKey.SETTINGS_FORM$ENABLE_CONFIRMATION_MODE_LABEL)}
    </Switch>
  );
}
