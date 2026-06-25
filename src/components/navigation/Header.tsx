"use client";

import React from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Menu, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onMenuClick,
  showMenuButton = false,
}) => {
  const { data: session } = useSession();
  const userName = session?.user?.name || "User";
  const userRole = (session?.user as any)?.role || "CAPTAIN";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white/80 dark:bg-dark-bg/85 backdrop-blur-md border-b border-light-border dark:border-dark-border">
      {/* Left section: Hamburger (Admin mobile) or Logo (Captain) */}
      <div className="flex items-center gap-3">
        {showMenuButton && onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-light-text-muted hover:bg-gray-100 dark:hover:bg-dark-card transition-all cursor-pointer active:scale-95"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Brand logo for Captains, or Screen Title for Admins */}
        {title ? (
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-light-text-main dark:text-dark-text-main">
            {title}
          </h1>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-brand-green-50 flex items-center justify-center border border-brand-green-500/10">
              <Image
                src="/logo.png"
                alt="Mawjood"
                fill
                sizes="32px"
                className="object-cover"
              />
            </div>
            <span className="text-base font-bold tracking-tight text-light-text-main dark:text-dark-text-main">
              Mawjood Tracker
            </span>
          </div>
        )}
      </div>

      {/* Right section: User info & profile indicator */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        
        <div className="flex flex-col items-end hidden sm:flex">
          <span className="text-sm font-bold text-light-text-main dark:text-dark-text-main leading-none">
            {userName}
          </span>
          <Badge
            variant={userRole === "ADMIN" ? "primary" : "neutral"}
            className="mt-1 font-bold text-[10px] uppercase px-1.5 py-0 leading-none"
          >
            {userRole}
          </Badge>
        </div>

        {/* Profile Circle Avatar */}
        <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-light-bg dark:bg-dark-card flex items-center justify-center border border-light-border dark:border-dark-border text-light-text-muted dark:text-dark-text-muted select-none">
          <UserIcon size={18} />
        </div>
      </div>
    </header>
  );
};

export default Header;
