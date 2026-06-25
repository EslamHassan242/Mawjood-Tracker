"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { User, Mail, LogOut, ShieldAlert, Award, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice } from "@/lib/utils";

export default function CaptainProfilePage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<{ tripsCount: number; revenue: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const userName = session?.user?.name || "Captain";
  const userEmail = session?.user?.email || "captain@mawjood.app";

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch("/api/trips/summary");
        if (res.ok) {
          const data = await res.json();
          setStats({ tripsCount: data.tripsCount, revenue: data.revenue });
        }
      } catch (err) {
        console.error("Error fetching profile summary:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSummary();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-bold text-light-text-main dark:text-dark-text-main">
          My Profile
        </h2>
        <p className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted">
          Manage your operations account and check session status.
        </p>
      </div>

      {/* Account Details Card */}
      <Card className="p-6 border-light-border dark:border-dark-border flex flex-col gap-5 bg-white dark:bg-dark-card shadow-xs">
        {/* Header Avatar and Name */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-green-50 dark:bg-brand-green-500/10 border border-brand-green-500/20 text-brand-green-500 dark:text-brand-green-100 flex items-center justify-center font-black text-xl select-none">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-lg font-bold text-light-text-main dark:text-dark-text-main">
              {userName}
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-light-text-muted dark:text-dark-text-muted">
              <Award size={14} className="text-brand-gold-600 dark:text-brand-gold-500" />
              <span>Active Mawjood Captain</span>
            </div>
          </div>
        </div>

        <div className="border-t border-light-border dark:border-dark-border/60 my-1" />

        {/* Account Info Details */}
        <div className="flex flex-col gap-3.5">
          {/* Email Row */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-light-bg dark:bg-dark-bg/50 text-light-text-muted dark:text-dark-text-muted">
              <Mail size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-light-text-muted/70 dark:text-dark-text-muted/70 uppercase tracking-wider leading-none">
                Operations Email
              </span>
              <span className="text-sm font-semibold text-light-text-main dark:text-dark-text-main mt-0.5">
                {userEmail}
              </span>
            </div>
          </div>

          {/* Date Joined Placeholder */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-light-bg dark:bg-dark-bg/50 text-light-text-muted dark:text-dark-text-muted">
              <CalendarDays size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-light-text-muted/70 dark:text-dark-text-muted/70 uppercase tracking-wider leading-none">
                System Access
              </span>
              <span className="text-sm font-semibold text-light-text-main dark:text-dark-text-main mt-0.5">
                Authorized / 24h Shift
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Today's Stats Card */}
      <Card className="p-5 border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-bg/40 flex flex-col gap-4">
        <h3 className="text-xs font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-widest">
          Today's Output Status
        </h3>
        
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted">
                Completed Trips
              </span>
              <span className="text-2xl font-black text-light-text-main dark:text-dark-text-main mt-1">
                {stats.tripsCount}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted">
                Earned Revenue
              </span>
              <span className="text-2xl font-black text-brand-green-500 dark:text-brand-green-100 mt-1">
                {formatPrice(stats.revenue)}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-xs font-semibold text-red-500">Failed to load summary stats.</span>
        )}
      </Card>

      {/* Logout Button */}
      <Button
        variant="danger"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="w-full py-3.5 flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-base rounded-2xl shadow-sm hover:bg-red-700"
      >
        <LogOut size={18} />
        <span>Log Out of Account</span>
      </Button>

      {/* App Version Info */}
      <div className="text-center flex flex-col gap-1 mt-2">
        <span className="text-[10px] font-black text-light-text-muted/50 dark:text-dark-text-muted/50 uppercase tracking-widest">
          Mawjood Tracker PWA
        </span>
        <span className="text-[10px] font-semibold text-light-text-muted/45 dark:text-dark-text-muted/45">
          v1.0.0 (Production-Ready)
        </span>
      </div>
    </div>
  );
}
