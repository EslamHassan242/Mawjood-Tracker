"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

export const BottomNav: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Routes",
      href: "/captain",
      icon: <LayoutGrid size={22} />,
    },
    {
      label: "History",
      href: "/captain/history",
      icon: <Clock size={22} />,
    },
    {
      label: "Profile",
      href: "/captain/profile",
      icon: <User size={22} />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-dark-card/95 backdrop-blur-md border-t border-light-border dark:border-dark-border safe-padding-bottom shadow-lg">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-90",
                isActive
                  ? "text-brand-green-500 dark:text-brand-green-100"
                  : "text-light-text-muted/70 dark:text-dark-text-muted/70 hover:text-light-text-main dark:hover:text-dark-text-main"
              )}
            >
              <div
                className={cn(
                  "p-1 rounded-xl transition-all duration-200",
                  isActive && "bg-brand-green-50 dark:bg-brand-green-500/15 scale-110"
                )}
              >
                {item.icon}
              </div>
              <span className="mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
