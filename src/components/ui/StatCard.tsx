import React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  iconColor?: "green" | "gold" | "blue" | "red" | "neutral";
  isLoading?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  iconColor = "neutral",
  isLoading = false,
  className,
}) => {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted">
            {title}
          </span>
          {isLoading ? (
            <div className="h-9 w-24 bg-light-border dark:bg-dark-border animate-pulse rounded-lg mt-1" />
          ) : (
            <span className="text-3xl font-bold tracking-tight text-light-text-main dark:text-dark-text-main animate-count-up">
              {value}
            </span>
          )}
          {subtext && !isLoading && (
            <span className="text-xs font-medium text-light-text-muted/80 dark:text-dark-text-muted/80 mt-0.5">
              {subtext}
            </span>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "p-3 rounded-xl flex items-center justify-center transition-all",
              {
                "bg-brand-green-50 text-brand-green-500 dark:bg-brand-green-500/10 dark:text-brand-green-100":
                  iconColor === "green",
                "bg-brand-gold-100 text-brand-gold-500 dark:bg-brand-gold-500/10 dark:text-brand-gold-100":
                  iconColor === "gold",
                "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400":
                  iconColor === "blue",
                "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400":
                  iconColor === "red",
                "bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400":
                  iconColor === "neutral",
              }
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatCard;
