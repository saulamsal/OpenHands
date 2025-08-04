import { AnimatedBackground } from "#/../components/motion-primitives/animated-background";

interface SegmentedControlOption {
  value: string;
  label: React.ReactNode | (() => React.ReactNode);
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  itemClassName?: string;
}

export function SegmentedControl({
  options,
  value,
  defaultValue,
  onValueChange,
  className = "",
  itemClassName,
}: SegmentedControlProps) {
  const handleValueChange = (selectedValue: string | null) => {
    if (selectedValue && onValueChange) {
      onValueChange(selectedValue);
    }
  };

  return (
    <div className={`rounded-full bg-muted p-[2.5px]  ${className}`}>
      <AnimatedBackground
        defaultValue={value || defaultValue}
        onValueChange={handleValueChange}
        className="rounded-full bg-background"
        transition={{
          ease: "easeInOut",
          duration: 0.2,
        }}
      >
        {options.map((option, index) => {
          // Handle both string, JSX, and function labels
          const labelContent =
            typeof option.label === "function" ? option.label() : option.label;

          // Create aria-label from label content
          const ariaLabel =
            typeof labelContent === "string"
              ? `${labelContent} view`
              : `${option.value} view`;

          return (
            <button
              key={index}
              data-id={option.value}
              type="button"
              aria-label={ariaLabel}
              className={`inline-flex min-w-[120px] items-center justify-center px-4 py-1
                text-center text-foreground transition-transform active:scale-[0.98] ${itemClassName}`}
            >
              {labelContent}
            </button>
          );
        })}
      </AnimatedBackground>
    </div>
  );
}
