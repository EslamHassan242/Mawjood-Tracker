"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  User,
  Clock,
  ArrowLeft,
  Navigation,
  Landmark,
  UserX,
  Calendar,
  ChevronRight,
  Map,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice, formatTime, formatDateShort } from "@/lib/utils";
import { toast } from "sonner";

interface CaptainDetails {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

interface RouteBreakdownItem {
  fromArea: string;
  toArea: string;
  tripsCount: number;
  revenue: number;
}

interface TripHistoryItem {
  id: string;
  unitPrice: number;
  createdAt: string;
  route: {
    fromArea: { name: string };
    toArea: { name: string };
  };
}

interface Stats {
  totalTrips: number;
  totalRevenue: number;
  routeBreakdown: RouteBreakdownItem[];
  history: TripHistoryItem[];
}

export default function AdminCaptainDetailsPage() {
  const { id: captainId } = useParams() as { id: string };
  const router = useRouter();

  const [captain, setCaptain] = useState<CaptainDetails | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<"today" | "yesterday" | "last7" | "last30" | "custom">("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Set default dates
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    setStartDate(todayStr);
    setEndDate(todayStr);
  }, []);

  // Fetch captain details and statistics
  async function fetchCaptainStats() {
    setIsLoading(true);
    try {
      let url = `/api/admin/captains/${captainId}?filter=${filter}`;
      if (filter === "custom" && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch captain stats");
      }

      setCaptain(data.captain);
      setStats(data.stats);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load stats");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (captainId) {
      fetchCaptainStats();
    }
  }, [captainId, filter, startDate, endDate]);

  // Handle deactivating captain
  const handleDeactivate = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to deactivate this captain's account? They will not be able to log in, but all historical trip records will be preserved."
    );
    if (!confirmed) return;

    setIsDeactivating(true);
    try {
      const res = await fetch(`/api/admin/captains/${captainId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Captain deactivated successfully");
        router.push("/admin/captains");
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to deactivate captain");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to deactivate captain");
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Back link */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push("/admin/captains")}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-light-text-muted hover:text-light-text-main dark:text-dark-text-muted dark:hover:text-dark-text-main cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Captains</span>
        </button>
      </div>

      {/* Profile Card & Action */}
      {isLoading && !captain ? (
        <Skeleton className="h-28" />
      ) : (
        captain && (
          <Card className="p-6 border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-green-50 dark:bg-brand-green-500/10 border border-brand-green-500/15 text-brand-green-500 dark:text-brand-green-100 flex items-center justify-center font-bold text-lg select-none">
                {captain.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-extrabold text-light-text-main dark:text-dark-text-main leading-none">
                    {captain.name}
                  </h2>
                  <Badge variant={captain.isActive ? "success" : "danger"}>
                    {captain.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <span className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted">
                  {captain.email}
                </span>
              </div>
            </div>

            {/* Deactivate account */}
            {captain.isActive && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeactivate}
                isLoading={isDeactivating}
                className="flex items-center gap-1.5 self-start sm:self-center px-3 py-2 rounded-xl cursor-pointer"
              >
                <UserX size={14} />
                <span>Deactivate Captain</span>
              </Button>
            )}
          </Card>
        )
      )}

      {/* Date Filters Tabs */}
      <Card className="p-1.5 bg-gray-100 dark:bg-dark-bg/60 border-light-border dark:border-dark-border flex flex-wrap gap-1 rounded-xl">
        {(["today", "yesterday", "last7", "last30", "custom"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex-1 min-w-[70px] py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              filter === tab
                ? "bg-white dark:bg-dark-card text-brand-green-500 dark:text-brand-green-100 shadow-xs"
                : "text-light-text-muted hover:text-light-text-main dark:text-dark-text-muted dark:hover:text-dark-text-main"
            }`}
          >
            {tab === "last7"
              ? "Last 7 Days"
              : tab === "last30"
              ? "Last 30 Days"
              : tab === "custom"
              ? "Custom"
              : tab}
          </button>
        ))}
      </Card>

      {/* Custom Date Pickers */}
      {filter === "custom" && (
        <Card className="p-4 border-light-border dark:border-dark-border grid grid-cols-2 gap-3 animate-fade-in-up">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs font-bold rounded-lg border border-light-border dark:border-dark-border p-2 bg-white dark:bg-dark-card text-light-text-main dark:text-dark-text-main focus:outline-none focus:border-brand-green-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs font-bold rounded-lg border border-light-border dark:border-dark-border p-2 bg-white dark:bg-dark-card text-light-text-main dark:text-dark-text-main focus:outline-none focus:border-brand-green-500"
            />
          </div>
        </Card>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5 border-light-border dark:border-dark-border bg-white dark:bg-dark-card flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted">
              Trips Completed
            </span>
            <span className="text-3xl font-black text-light-text-main dark:text-dark-text-main animate-count-up">
              {isLoading ? "..." : stats?.totalTrips ?? 0}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-brand-green-50 text-brand-green-500 dark:bg-brand-green-500/10 dark:text-brand-green-100">
            <Navigation size={20} />
          </div>
        </Card>

        <Card className="p-5 border-light-border dark:border-dark-border bg-white dark:bg-dark-card flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted">
              Revenue Generated
            </span>
            <span className="text-3xl font-black text-brand-green-500 dark:text-brand-green-100 animate-count-up">
              {isLoading ? "..." : formatPrice(stats?.totalRevenue ?? 0)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-brand-gold-100 text-brand-gold-500 dark:bg-brand-gold-500/10 dark:text-brand-gold-100">
            <Landmark size={20} />
          </div>
        </Card>
      </div>

      {/* Route Breakdown & Trip Log Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route Breakdown Column (Takes 1 share on lg) */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <h3 className="text-base font-bold text-light-text-main dark:text-dark-text-main flex items-center gap-1.5">
            <Map size={18} className="text-light-text-muted dark:text-dark-text-muted" />
            <span>Route Breakdown</span>
          </h3>

          {isLoading ? (
            <Skeleton className="h-40" />
          ) : !stats || stats.routeBreakdown.length === 0 ? (
            <Card className="p-5 text-center text-xs font-semibold text-light-text-muted dark:text-dark-text-muted border border-light-border dark:border-dark-border">
              No routes completed in this period.
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {stats.routeBreakdown.map((item, index) => (
                <Card
                  key={index}
                  className="p-4 border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-xs flex flex-col gap-2"
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span className="text-light-text-main dark:text-dark-text-main">
                      {item.fromArea}
                    </span>
                    <ChevronRight size={10} className="text-light-text-muted" />
                    <span className="text-light-text-main dark:text-dark-text-main">
                      {item.toArea}
                    </span>
                  </div>
                  <div className="flex justify-between items-end mt-1 text-xs select-none border-t border-light-border dark:border-dark-border/40 pt-2">
                    <span className="font-semibold text-light-text-muted dark:text-dark-text-muted">
                      {item.tripsCount} {item.tripsCount === 1 ? "trip" : "trips"}
                    </span>
                    <span className="font-extrabold text-brand-green-500 dark:text-brand-green-100">
                      {formatPrice(item.revenue)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Trip Log Column (Takes 2 shares on lg) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h3 className="text-base font-bold text-light-text-main dark:text-dark-text-main flex items-center gap-1.5">
            <Clock size={18} className="text-light-text-muted dark:text-dark-text-muted" />
            <span>Trip Log Feed</span>
          </h3>

          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[74px]" />
            ))
          ) : !stats || stats.history.length === 0 ? (
            <EmptyState
              title="No trips registered"
              description="This captain has no recorded trips for the selected period."
              icon={<Clock size={36} />}
            />
          ) : (
            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto no-scrollbar">
              {stats.history.map((trip) => (
                <Card
                  key={trip.id}
                  className="p-4 border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-xs flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    {/* Timestamp */}
                    <div className="flex flex-col items-center justify-center bg-light-bg dark:bg-dark-bg/50 px-2.5 py-1.5 rounded-xl text-light-text-muted dark:text-dark-text-muted border border-light-border/40 dark:border-dark-border/40 select-none">
                      <span className="text-[10px] font-bold leading-none">
                        {formatTime(trip.createdAt)}
                      </span>
                    </div>

                    {/* Route Details */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-light-text-main dark:text-dark-text-main">
                        <span>{trip.route.fromArea.name}</span>
                        <ChevronRight size={12} className="text-light-text-muted" />
                        <span>{trip.route.toArea.name}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-light-text-muted dark:text-dark-text-muted mt-0.5">
                        {formatDateShort(trip.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Pricing */}
                  <span className="text-base font-black text-brand-green-500 dark:text-brand-green-100">
                    {formatPrice(trip.unitPrice)}
                  </span>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
