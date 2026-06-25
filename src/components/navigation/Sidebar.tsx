"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";
import {
  BarChart3,
  Users,
  Map,
  MapPin,
  FileSpreadsheet,
  LogOut,
  X,
  ClipboardList
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = false,
  onClose,
  isMobile = false,
}) => {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: <BarChart3 size={20} />,
    },
    {
      label: "Captains",
      href: "/admin/captains",
      icon: <Users size={20} />,
    },
    {
      label: "Routes",
      href: "/admin/routes",
      icon: <Map size={20} />,
    },
    {
      label: "Areas",
      href: "/admin/areas",
      icon: <MapPin size={20} />,
    },
    {
      label: "Reports",
      href: "/admin/reports",
      icon: <FileSpreadsheet size={20} />,
    },
    {
      label: "Audit Logs",
      href: "/admin/audit",
      icon: <ClipboardList size={20} />,
    },
  ];

  const content = (
    <div className="flex flex-col h-full bg-white dark:bg-dark-card border-r border-light-border dark:border-dark-border py-6 px-4">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-2 mb-8">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-brand-green-50 flex items-center justify-center border border-brand-green-500/10">
            <Image
              src="/logo.png"
              alt="Mawjood"
              fill
              sizes="36px"
              priority
              className="object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-light-text-main dark:text-dark-text-main">
              Mawjood
            </span>
            <span className="text-xs font-bold text-brand-gold-600 dark:text-brand-gold-500 uppercase tracking-wider leading-none">
              Operations
            </span>
          </div>
        </div>

        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-light-text-muted hover:bg-gray-100 dark:hover:bg-dark-border transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col gap-1.5 px-1">
        {navItems.map((item) => {
          // Match subroutes as well, e.g., /admin/captains/[id] matches /admin/captains
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => isMobile && onClose && onClose()}
              className={cn(
                "flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer active:scale-[0.98]",
                isActive
                  ? "bg-brand-green-500 text-white shadow-md shadow-brand-green-500/15 dark:bg-brand-green-500 dark:text-white"
                  : "text-light-text-muted hover:bg-gray-100 dark:text-dark-text-muted dark:hover:bg-dark-bg/50 hover:text-light-text-main dark:hover:text-dark-text-main"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sign Out & Theme Toggle Footer */}
      <div className="px-1 border-t border-light-border dark:border-dark-border pt-4 flex items-center justify-between gap-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200 cursor-pointer active:scale-[0.98]"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
        <ThemeToggle />
      </div>
    </div>
  );

  if (isMobile) {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex animate-fade-in-up">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
        {/* Drawer content */}
        <div className="relative w-64 h-full z-10 flex flex-col transform translate-x-0 transition-transform duration-300">
          {content}
        </div>
      </div>
    );
  }

  return <div className="hidden lg:flex flex-col w-64 h-screen sticky top-0">{content}</div>;
};

export default Sidebar;
