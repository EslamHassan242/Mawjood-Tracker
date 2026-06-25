"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Users,
  Map,
  Calendar,
  DollarSign,
  TrendingUp,
  Download,
  Clock,
  ChevronRight,
  User,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice, formatTime, formatDateShort } from "@/lib/utils";
import { toast } from "sonner";

interface Captain {
  id: string;
  name: string;
}

interface Route {
  id: string;
  fromArea: { name: string };
  toArea: { name: string };
}

interface RouteBreakdownItem {
  fromArea: string;
  toArea: string;
  tripsCount: number;
  revenue: number;
}

interface TripReportRecord {
  id: string;
  unitPrice: number;
  createdAt: string;
  captain: {
    name: string;
  };
  route: {
    fromArea: { name: string };
    toArea: { name: string };
  };
}

export default function AdminReportsPage() {
  // Filter dropdown data
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  
  // Selected filters
  const [selectedCaptain, setSelectedCaptain] = useState("all");
  const [selectedRoute, setSelectedRoute] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Report results
  const [reportStats, setReportStats] = useState<{
    totalTrips: number;
    totalRevenue: number;
    routeBreakdown: RouteBreakdownItem[];
  } | null>(null);
  const [trips, setTrips] = useState<TripReportRecord[]>([]);
  
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(true);

  // Set default dates (current month)
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  }, []);

  // Fetch dropdown metadata on mount
  useEffect(() => {
    async function fetchMetadata() {
      try {
        const [captainsRes, routesRes] = await Promise.all([
          fetch("/api/admin/captains"),
          fetch("/api/admin/routes"),
        ]);

        if (captainsRes.ok && routesRes.ok) {
          const captainsData = await captainsRes.json();
          const routesData = await routesRes.json();
          setCaptains(captainsData.captains);
          setRoutes(routesData.routes);
        }
      } catch (err) {
        console.error("Error fetching report filters:", err);
      } finally {
        setIsLoadingMetadata(false);
      }
    }
    fetchMetadata();
  }, []);

  // Fetch report data on filter change
  async function fetchReport() {
    setIsLoadingReport(true);
    try {
      let url = `/api/admin/reports?captainId=${selectedCaptain}&routeId=${selectedRoute}`;
      if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate report");
      }

      setReportStats(data.stats);
      setTrips(data.trips);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load report");
    } finally {
      setIsLoadingReport(false);
    }
  }

  useEffect(() => {
    if (startDate && endDate) {
      fetchReport();
    }
  }, [selectedCaptain, selectedRoute, startDate, endDate]);

  // Handle CSV export
  const handleExportCSV = () => {
    let url = `/api/admin/reports/export?captainId=${selectedCaptain}&routeId=${selectedRoute}`;
    if (startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }
    // Directly trigger file download by setting window location
    window.location.href = url;
    toast.success("CSV export initiated");
  };

  const totalTrips = reportStats?.totalTrips ?? 0;
  const totalRevenue = reportStats?.totalRevenue ?? 0;

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Title section */}
      <div className="flex flex-col gap-0.5">
        <h2 className="text-xl font-black text-light-text-main dark:text-dark-text-main tracking-tight">
          Financial & Operations Reports
        </h2>
        <p className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted">
          Query deep ledger details, audit captain trips, and export to CSV sheets.
        </p>
      </div>

      {/* Filters Card */}
      <Card className="p-5 border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Captain Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Users size={12} className="text-brand-green-500" />
            <span>Captain Filter</span>
          </label>
          <select
            value={selectedCaptain}
            onChange={(e) => setSelectedCaptain(e.target.value)}
            className="w-full rounded-xl border border-light-border dark:border-dark-border p-2.5 bg-white dark:bg-dark-card text-light-text-main dark:text-dark-text-main focus:outline-none focus:border-brand-green-500 font-semibold text-xs"
            disabled={isLoadingMetadata}
          >
            <option value="all">All Captains</option>
            {captains.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Route Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Map size={12} className="text-brand-green-500" />
            <span>Route Filter</span>
          </label>
          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="w-full rounded-xl border border-light-border dark:border-dark-border p-2.5 bg-white dark:bg-dark-card text-light-text-main dark:text-dark-text-main focus:outline-none focus:border-brand-green-500 font-semibold text-xs"
            disabled={isLoadingMetadata}
          >
            <option value="all">All Routes</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fromArea.name} → {r.toArea.name}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={12} className="text-brand-green-500" />
            <span>Start Date</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-xl border border-light-border dark:border-dark-border p-2 bg-white dark:bg-dark-card text-light-text-main dark:text-dark-text-main focus:outline-none focus:border-brand-green-500 font-semibold text-xs"
            disabled={isLoadingMetadata}
          />
        </div>

        {/* End Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={12} className="text-brand-green-500" />
            <span>End Date</span>
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-xl border border-light-border dark:border-dark-border p-2 bg-white dark:bg-dark-card text-light-text-main dark:text-dark-text-main focus:outline-none focus:border-brand-green-500 font-semibold text-xs"
            disabled={isLoadingMetadata}
          />
        </div>
      </Card>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-light-border dark:border-dark-border bg-white dark:bg-dark-card flex items-center justify-between col-span-1">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted">
              Matching Trips
            </span>
            <span className="text-3xl font-black text-light-text-main dark:text-dark-text-main animate-count-up">
              {isLoadingReport ? "..." : totalTrips}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-brand-green-50 text-brand-green-500 dark:bg-brand-green-500/10 dark:text-brand-green-100">
            <TrendingUp size={20} />
          </div>
        </Card>

        <Card className="p-5 border-light-border dark:border-dark-border bg-white dark:bg-dark-card flex items-center justify-between col-span-1">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted">
              Accrued Revenue
            </span>
            <span className="text-3xl font-black text-brand-green-500 dark:text-brand-green-100 animate-count-up">
              {isLoadingReport ? "..." : formatPrice(totalRevenue)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-brand-gold-100 text-brand-gold-500 dark:bg-brand-gold-500/10 dark:text-brand-gold-100">
            <DollarSign size={20} />
          </div>
        </Card>

        {/* Download CSV button */}
        <Card className="p-5 border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-bg/40 flex items-center justify-between col-span-1 border-dashed">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-light-text-main dark:text-dark-text-main">
              Export Data Ledger
            </span>
            <span className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted">
              Download formatted spreadsheet
            </span>
          </div>
          <Button
            onClick={handleExportCSV}
            disabled={isLoadingReport || totalTrips === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </Button>
        </Card>
      </div>

      {/* Breakdown and Ledger Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route Breakdown */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <h3 className="text-base font-bold text-light-text-main dark:text-dark-text-main flex items-center gap-1.5">
            <Map size={18} className="text-light-text-muted dark:text-dark-text-muted" />
            <span>Route Breakdown</span>
          </h3>

          {isLoadingReport ? (
            <Skeleton className="h-44" />
          ) : !reportStats || reportStats.routeBreakdown.length === 0 ? (
            <Card className="p-5 text-center text-xs font-semibold text-light-text-muted dark:text-dark-text-muted border border-light-border dark:border-dark-border">
              No matching records for this breakdown.
            </Card>
          ) : (
            <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto no-scrollbar">
              {reportStats.routeBreakdown.map((item, index) => (
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
                  <div className="flex justify-between items-end mt-1 text-xs border-t border-light-border dark:border-dark-border/40 pt-2 select-none">
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

        {/* Ledger Log Feed */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h3 className="text-base font-bold text-light-text-main dark:text-dark-text-main flex items-center gap-1.5">
            <Clock size={18} className="text-light-text-muted dark:text-dark-text-muted" />
            <span>Transaction Ledger Feed</span>
          </h3>

          {isLoadingReport ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))
          ) : trips.length === 0 ? (
            <EmptyState
              title="No records found"
              description="No recorded trips match the current filter parameters."
              icon={<FileSpreadsheet size={36} />}
            />
          ) : (
            <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto no-scrollbar">
              {trips.map((trip) => (
                <Card
                  key={trip.id}
                  className="p-4 border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    {/* Time */}
                    <div className="flex flex-col items-center justify-center bg-light-bg dark:bg-dark-bg/50 px-2.5 py-1.5 rounded-xl text-light-text-muted dark:text-dark-text-muted border border-light-border/40 dark:border-dark-border/40 select-none">
                      <span className="text-[10px] font-bold leading-none">
                        {formatTime(trip.createdAt)}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      {/* Route */}
                      <div className="flex items-center gap-1.5 font-bold text-sm text-light-text-main dark:text-dark-text-main">
                        <span>{trip.route.fromArea.name}</span>
                        <ChevronRight size={12} className="text-light-text-muted" />
                        <span>{trip.route.toArea.name}</span>
                      </div>
                      
                      {/* Captain & Date info */}
                      <div className="flex items-center gap-2 mt-1 select-none">
                        <span className="text-[10px] font-bold text-brand-gold-600 dark:text-brand-gold-500 uppercase tracking-wider flex items-center gap-1">
                          <User size={10} />
                          <span>{trip.captain.name}</span>
                        </span>
                        <span className="text-[10px] font-semibold text-light-text-muted/80 dark:text-dark-text-muted/80">
                          • {formatDateShort(trip.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <span className="text-base font-black text-brand-green-500 dark:text-brand-green-100 self-end sm:self-center">
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
