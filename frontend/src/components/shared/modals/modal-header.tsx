import React from "react";
import { cn } from "#/utils/cn";
import { X } from "#/components/shared/icons";

interface ModalHeaderProps {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function ModalHeader({
  children,
  onClose,
  className,
}: ModalHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between w-full", className)}>
      <h2 className="text-lg font-semibold">{children}</h2>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-accent transition-colors"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}
