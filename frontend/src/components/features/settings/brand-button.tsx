import { cn } from "#/utils/utils";
import { Button } from "#/components/shared/buttons/button";

interface BrandButtonProps {
  testId?: string;
  name?: string;
  variant: "primary" | "secondary" | "danger";
  type: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
  isDisabled?: boolean;
  className?: string;
  onClick?: () => void;
  startContent?: React.ReactNode;
}

export function BrandButton({
  testId,
  name,
  children,
  variant,
  type,
  isDisabled,
  className,
  onClick,
  startContent,
  ...props
}: React.PropsWithChildren<BrandButtonProps>) {
  return (
    <Button
      name={name}
      data-testid={testId}
      disabled={isDisabled}
      // The type is alreadt passed as a prop to the button component
      // eslint-disable-next-line react/button-has-type
      type={type}
      onClick={onClick}
      className={cn(
        "w-fit p-2 text-sm rounded-sm disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 cursor-pointer",
        variant === "primary" && "bg-primary text-primary-foreground",
        variant === "secondary" && "border border-primary text-primary",
        variant === "danger" &&
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        startContent && "flex items-center justify-center gap-2",
        className,
      )}
      is3d={variant === "primary"}
      {...props}
    >
      {startContent}
      {children}
    </Button>
  );
}
