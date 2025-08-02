import { cn } from "#/utils/utils";

interface BrandBadgeProps {
  className?: string;
}

export function BrandBadge({
  children,
  className,
}: React.PropsWithChildren<BrandBadgeProps>) {
  return (
    <span
      className={cn(
        "text-sm leading-4 text-primary-foreground font-semibold tracking-tighter bg-primary p-1 rounded-full",
        className,
      )}
    >
      {children}
    </span>
  );
}
