import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "success" | "warning" | "danger" | "neutral";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide transition-all",
        {
          "bg-brand-green-50 text-brand-green-500 dark:bg-brand-green-500/10 dark:text-brand-green-100":
            variant === "primary",
          "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300":
            variant === "success",
          "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300":
            variant === "warning",
          "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300":
            variant === "danger",
          "bg-light-border text-light-text-muted dark:bg-dark-border dark:text-dark-text-muted":
            variant === "neutral",
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
