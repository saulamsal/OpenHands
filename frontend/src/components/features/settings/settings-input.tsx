import { cn } from "#/utils/utils";
import { OptionalTag } from "./optional-tag";

interface SettingsInputProps {
  testId?: string;
  name?: string;
  label: string;
  type: React.HTMLInputTypeAttribute;
  defaultValue?: string;
  value?: string;
  placeholder?: string;
  showOptionalTag?: boolean;
  isDisabled?: boolean;
  startContent?: React.ReactNode;
  className?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
}

export function SettingsInput({
  testId,
  name,
  label,
  type,
  defaultValue,
  value,
  placeholder,
  showOptionalTag,
  isDisabled,
  startContent,
  className,
  onChange,
  required,
  min,
  max,
  step,
  pattern,
}: SettingsInputProps) {
  return (
    <label className={cn("flex flex-col gap-2.5 w-fit", className)}>
      <div className="flex items-center gap-2">
        {startContent}
        <span className="text-sm text-foreground">{label}</span>
        {showOptionalTag && <OptionalTag />}
      </div>
      <input
        data-testid={testId}
        onChange={(e) => onChange && onChange(e.target.value)}
        name={name}
        disabled={isDisabled}
        type={type}
        defaultValue={defaultValue}
        value={value}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        required={required}
        pattern={pattern}
        className={cn(
          "bg-input border h-10 w-full rounded-sm p-2 placeholder:italic placeholder:text-muted-foreground text-foreground",
          "disabled:bg-muted disabled:border disabled:cursor-not-allowed disabled:text-muted-foreground",
          "focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none",
        )}
      />
    </label>
  );
}
