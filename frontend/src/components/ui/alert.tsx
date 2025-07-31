import * as React from "react";
import { cn } from "#/utils/cn";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive";
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", children, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "relative w-full rounded-lg border px-4 py-3 text-sm flex items-center gap-2",
        variant === "default" && "bg-background border-border",
        variant === "destructive" &&
          "bg-destructive/10 border-destructive/20 text-destructive",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
Alert.displayName = "Alert";

export { Alert };
