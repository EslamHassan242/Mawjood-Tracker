import React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No data found",
  description = "There are no records to display at the moment.",
  icon = <Inbox size={40} />,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 border border-dashed border-light-border dark:border-dark-border rounded-2xl bg-white/50 dark:bg-dark-card/30 backdrop-blur-xs",
        className
      )}
    >
      <div className="p-4 rounded-full bg-light-bg dark:bg-dark-bg/50 text-light-text-muted/60 dark:text-dark-text-muted/60 mb-4 animate-fade-in-up">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-light-text-main dark:text-dark-text-main mb-1.5">
        {title}
      </h3>
      <p className="text-sm font-medium text-light-text-muted dark:text-dark-text-muted max-w-sm mb-5">
        {description}
      </p>
      {action && <div className="animate-fade-in-up">{action}</div>}
    </div>
  );
};

export default EmptyState;
