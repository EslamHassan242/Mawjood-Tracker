import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  glass?: boolean;
  gradient?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable = false, glass = false, gradient = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border p-5 transition-all duration-300",
          // Base styles
          {
            "bg-light-card border-light-border dark:bg-dark-card dark:border-dark-border":
              !glass && !gradient,
            "glass-panel": glass,
            "bg-gradient-to-br from-brand-green-500 to-brand-green-700 text-white border-transparent shadow-lg":
              gradient,
            // Interactive options
            "hover:shadow-md hover:translate-y-[-2px] cursor-pointer": hoverable,
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
export default Card;
