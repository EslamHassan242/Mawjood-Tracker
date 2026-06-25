"use client";

import React, { useState, useEffect } from "react";
import { Users, Navigation, Landmark, CalendarRange, TrendingUp, RefreshCw } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { formatPrice } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<{
    totalCaptains: number;
    todayTrips: number;
    todayRevenue: number;
    monthRevenue: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function fetchDashboardStats(silent = false) {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalCaptains: data.totalCaptains,
          todayTrips: data.todayTrips,
          todayRevenue: data.todayRevenue,
          monthRevenue: data.monthRevenue,
        });
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
  }
}

  // Initial load & Real-time SSE Connection (Instant updates, no visual refreshing noise)
  useEffect(() => {
    // 1. Fetch initial stats normally on load
    fetchDashboardStats();

    // 2. Establish Server-Sent Events (SSE) connection for instant real-time broadcasts
    const eventSource = new EventSource("/api/admin/dashboard/realtime");

    eventSource.onmessage = (event) => {
      try {
        // Skip heartbeat pings
        if (event.data === "ping") return;

        const data = JSON.parse(event.data);
        setStats({
          totalCaptains: data.totalCaptains,
          todayTrips: data.todayTrips,
          todayRevenue: data.todayRevenue,
          monthRevenue: data.monthRevenue,
        });

        // Ensure loading states are resolved
        setIsLoading(false);
      } catch (err) {
        console.error("Error parsing real-time dashboard stats:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("Real-time connection error, EventSource will automatically reconnect in background:", err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome & Refresh section */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-light-text-main dark:text-dark-text-main tracking-tight">
              Operations Dashboard
            </h2>
            <div className="flex items-center gap-1.5 bg-brand-green-500/10 dark:bg-brand-green-500/15 border border-brand-green-500/20 px-2 py-0.5 rounded-full select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green-600"></span>
              </span>
              <span className="text-[9px] font-bold text-brand-green-600 dark:text-brand-green-400 uppercase tracking-wider leading-none">
                Live (Real-time)
              </span>
            </div>
          </div>
          <p className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted">
            Live operations tracking and revenue oversight.
          </p>
        </div>
        
        {/* Refresh button */}
        <button
          onClick={() => fetchDashboardStats(true)}
          disabled={isRefreshing || isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-light-text-muted hover:text-light-text-main dark:text-dark-text-muted dark:hover:text-dark-text-main bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-xs hover:shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
          <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Captains */}
        <StatCard
          title="Active Captains"
          value={stats?.totalCaptains ?? 0}
          subtext="Captains registered in system"
          icon={<Users size={20} />}
          iconColor="blue"
          isLoading={isLoading}
        />

        {/* Today's Trips */}
        <StatCard
          title="Today's Trips"
          value={stats?.todayTrips ?? 0}
          subtext="Completed trips today"
          icon={<Navigation size={20} />}
          iconColor="green"
          isLoading={isLoading}
        />

        {/* Today's Revenue */}
        <StatCard
          title="Today's Revenue"
          value={stats ? formatPrice(stats.todayRevenue) : formatPrice(0)}
          subtext="Revenue accrued today"
          icon={<Landmark size={20} />}
          iconColor="gold"
          isLoading={isLoading}
        />

        {/* This Month's Revenue */}
        <StatCard
          title="This Month Revenue"
          value={stats ? formatPrice(stats.monthRevenue) : formatPrice(0)}
          subtext="Cumulative month earnings"
          icon={<CalendarRange size={20} />}
          iconColor="neutral"
          isLoading={isLoading}
        />
      </div>

      {/* Info Section / Stripe Dashboard Theme Panel */}
      <Card className="p-6 bg-gradient-to-br from-brand-green-600 to-brand-green-700 text-white border-transparent relative overflow-hidden shadow-lg">
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-8 translate-y-8">
          <Landmark size={220} />
        </div>
        <div className="flex flex-col gap-2 relative z-10 max-w-xl">
          <span className="text-[10px] font-black tracking-widest uppercase text-brand-green-100">
            Real-time Ops Ledger
          </span>
          <h3 className="text-xl font-bold tracking-tight mt-1">
            System is tracking all deliveries instantly.
          </h3>
          <p className="text-sm font-semibold text-brand-green-100/85 mt-1 leading-relaxed">
            Every route completed by a captain updates this screen and records individual transactions. 
            You can review individual performance under the Captains panel, configure routes, 
            or export logs to CSV.
          </p>
        </div>
      </Card>
    </div>
  );
}
