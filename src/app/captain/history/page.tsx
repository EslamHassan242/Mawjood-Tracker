"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Clock, DollarSign, ArrowRight, ListFilter } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice, formatTime, formatDateShort } from "@/lib/utils";

interface Area {
  name: string;
}

interface Route {
  fromArea: Area;
  toArea: Area;
}

interface Trip {
  id: string;
  unitPrice: number;
  createdAt: string;
  route: Route;
}

export default function CaptainHistoryPage() {
  const [filter, setFilter] = useState<"today" | "yesterday" | "custom">("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Set default custom dates (current week)
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    setStartDate(todayStr);
    setEndDate(todayStr);
  }, []);

  // Fetch trips on filter or date change
  useEffect(() => {
    async function fetchTrips() {
      setIsLoading(true);
      try {
        let url = `/api/trips?filter=${filter}`;
        if (filter === "custom" && startDate && endDate) {
          url += `&startDate=${startDate}&endDate=${endDate}`;
        }
        
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setTrips(data.trips);
        }
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setIsLoading(false);
      }
    }

    // Only fetch custom if dates are defined
    if (filter !== "custom" || (startDate && endDate)) {
      fetchTrips();
    }
  }, [filter, startDate, endDate]);

  // Calculate totals
  const totalTrips = trips.length;
  const totalRevenue = trips.reduce((acc, trip) => acc + trip.unitPrice, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Title */}
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-bold text-light-text-main dark:text-dark-text-main">
          Delivery History
        </h2>
        <p className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted">
          Review your completed trips and daily earnings.
        </p>
      </div>

      {/* Date Filters Tabs */}
      <Card className="p-1.5 bg-gray-100 dark:bg-dark-bg/60 border-light-border dark:border-dark-border flex gap-1 rounded-xl">
        {(["today", "yesterday", "custom"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              filter === tab
                ? "bg-white dark:bg-dark-card text-brand-green-500 dark:text-brand-green-100 shadow-xs"
                : "text-light-text-muted hover:text-light-text-main dark:text-dark-text-muted dark:hover:text-dark-text-main"
            }`}
          >
            {tab === "custom" ? "Custom Date" : tab}
          </button>
        ))}
      </Card>

      {/* Custom Date Range Picker */}
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

      {/* History List */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          // Loading Skeleton
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px]" />
          ))
        ) : totalTrips === 0 ? (
          <EmptyState
            title="No trips recorded"
            description={
              filter === "today"
                ? "You haven't completed any trips today yet."
                : filter === "yesterday"
                ? "You didn't record any trips yesterday."
                : "No trips found for this custom date range."
            }
            icon={<Clock size={36} />}
          />
        ) : (
          trips.map((trip) => (
            <Card
              key={trip.id}
              className="p-4 border-light-border dark:border-dark-border flex items-center justify-between shadow-xs bg-white dark:bg-dark-card hover:border-brand-green-500/10 transition-all"
            >
              {/* Left: Time and Route */}
              <div className="flex items-center gap-3.5">
                {/* Time badge */}
                <div className="flex flex-col items-center justify-center bg-light-bg dark:bg-dark-bg/50 px-2.5 py-1.5 rounded-xl text-light-text-muted dark:text-dark-text-muted border border-light-border/40 dark:border-dark-border/40 select-none">
                  <Clock size={12} className="mb-0.5" />
                  <span className="text-[10px] font-bold tracking-tight">
                    {formatTime(trip.createdAt)}
                  </span>
                </div>

                {/* Route label */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-light-text-main dark:text-dark-text-main">
                      {trip.route.fromArea.name}
                    </span>
                    <ArrowRight size={12} className="text-light-text-muted/60 dark:text-dark-text-muted/60" />
                    <span className="text-sm font-bold text-light-text-main dark:text-dark-text-main">
                      {trip.route.toArea.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-light-text-muted/70 dark:text-dark-text-muted/70 mt-0.5">
                    {formatDateShort(trip.createdAt)}
                  </span>
                </div>
              </div>

              {/* Right: Price */}
              <span className="text-base font-extrabold text-brand-green-500 dark:text-brand-green-100">
                {formatPrice(trip.unitPrice)}
              </span>
            </Card>
          ))
        )}
      </div>

      {/* Floating Bottom Totals Summary */}
      {!isLoading && totalTrips > 0 && (
        <Card className="fixed bottom-16 left-0 right-0 max-w-md mx-auto z-35 rounded-t-2xl border-t border-x border-light-border dark:border-dark-border bg-white/95 dark:bg-dark-card/95 backdrop-blur-md px-5 py-4 flex justify-between items-center shadow-lg animate-toast-slide">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">
              Total Output
            </span>
            <span className="text-sm font-black text-light-text-main dark:text-dark-text-main">
              {totalTrips} {totalTrips === 1 ? "Trip" : "Trips"} Completed
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] font-black text-brand-gold-600 dark:text-brand-gold-500 uppercase tracking-wider">
              Total Revenue
            </span>
            <span className="text-lg font-black text-brand-green-500 dark:text-brand-green-100">
              {formatPrice(totalRevenue)}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
