import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";

interface CustomInputProps {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  type?: "text" | "password";
}

export function CustomInput({
  name,
  label,
  required,
  defaultValue,
  type = "text",
}: CustomInputProps) {
  const { t } = useTranslation();

  return (
    <label htmlFor={name} className="flex flex-col gap-2">
      <span className="text-[11px] leading-4 tracking-[0.5px] font-[500] text-muted-foreground">
        {label}
        {required && <span className="text-red-500 dark:text-red-400">*</span>}
        {!required && (
          <span className="text-muted-foreground">
            {" "}
            {t(I18nKey.CUSTOM_INPUT$OPTIONAL_LABEL)}
          </span>
        )}
      </span>
      <input
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        type={type}
        className="bg-input text-foreground text-xs py-[10px] px-3 rounded-sm border focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
      />
    </label>
  );
}
