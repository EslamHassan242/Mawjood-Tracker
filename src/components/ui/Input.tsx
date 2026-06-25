import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-semibold text-light-text-main/80 dark:text-dark-text-main/80">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-light-text-muted/70 dark:text-dark-text-muted/70 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            className={cn(
              "w-full rounded-xl border px-4 py-2.5 text-base transition-all duration-200 bg-white dark:bg-dark-card border-light-border dark:border-dark-border text-light-text-main dark:text-dark-text-main focus:outline-none focus:ring-2 focus:ring-brand-green-500/30 focus:border-brand-green-500 disabled:opacity-50 disabled:cursor-not-allowed",
              {
                "pl-11": !!icon,
                "border-red-500 focus:border-red-500 focus:ring-red-500/20": !!error,
              },
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <span className="text-xs font-medium text-red-500 mt-0.5 animate-fade-in-up">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
