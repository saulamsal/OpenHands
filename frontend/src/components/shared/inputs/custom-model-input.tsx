import { Input } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";

interface CustomModelInputProps {
  isDisabled: boolean;
  defaultValue: string;
}

export function CustomModelInput({
  isDisabled,
  defaultValue,
}: CustomModelInputProps) {
  const { t } = useTranslation();

  return (
    <fieldset className="flex flex-col gap-2">
      <label
        htmlFor="custom-model"
        className="font-[500] text-muted-foreground text-xs"
      >
        {t(I18nKey.SETTINGS_FORM$CUSTOM_MODEL_LABEL)}
      </label>
      <Input
        data-testid="custom-model-input"
        isDisabled={isDisabled}
        isRequired
        id="custom-model"
        name="custom-model"
        defaultValue={defaultValue}
        aria-label={t(I18nKey.MODEL$CUSTOM_MODEL)}
        classNames={{
          inputWrapper:
            "bg-input rounded-md text-sm px-3 py-[10px] text-foreground border",
        }}
      />
    </fieldset>
  );
}
