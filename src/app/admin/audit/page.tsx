"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  Calendar,
  User,
  Activity,
  ArrowRight,
  RefreshCw,
  Search
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";

interface AuditLog {
  id: string;
  actionType: "ENTRY_CREATED" | "ENTRY_UPDATED" | "ENTRY_DELETED" | "ENTRY_RESTORED";
  userId: string;
  captainName: string;
  routeInfo: string | null;
  ordersCount: number | null;
  amount: number | null;
  oldValues: string | null;
  newValues: string | null;
  timestamp: string;
  user: {
    name: string;
    email: string;
  };
}

interface Captain {
  id: string;
  name: string;
  email: string;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCaptains, setIsLoadingCaptains] = useState(true);

  // Filter States
  const [selectedCaptain, setSelectedCaptain] = useState<string>("all");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Fetch Captains list on mount
  useEffect(() => {
    async function fetchCaptains() {
      try {
        const res = await fetch("/api/admin/captains");
        if (res.ok) {
          const data = await res.json();
          setCaptains(data.captains || []);
        }
      } catch (err) {
        console.error("Error fetching captains:", err);
      } finally {
        setIsLoadingCaptains(false);
      }
    }
    fetchCaptains();
  }, []);

  // Fetch Audit Logs when filters change
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedCaptain !== "all") queryParams.set("captainId", selectedCaptain);
      if (selectedAction !== "all") queryParams.set("actionType", selectedAction);
      if (startDate) queryParams.set("startDate", startDate);
      if (endDate) queryParams.set("endDate", endDate);

      const res = await fetch(`/api/admin/audit?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedCaptain, selectedAction, startDate, endDate]);

  // Helper to format the Action Badge
  const renderActionBadge = (type: string) => {
    switch (type) {
      case "ENTRY_CREATED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 shadow-xs">
            Created
          </span>
        );
      case "ENTRY_UPDATED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-xs">
            Edited
          </span>
        );
      case "ENTRY_DELETED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shadow-xs">
            Deleted
          </span>
        );
      case "ENTRY_RESTORED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-xs">
            Restored
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-gray-500/10 text-gray-500 border border-gray-500/20">
            Action
          </span>
        );
    }
  };

  // Helper to format timestamps
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full animate-fade-in-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-light-border dark:border-dark-border pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-green-500/10 text-brand-green-500 dark:text-brand-green-400 border border-brand-green-500/20 shadow-xs">
            <ClipboardList size={24} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-black text-light-text-main dark:text-dark-text-main uppercase tracking-wider">
              Audit Logs Ledger
            </h1>
            <span className="text-xs font-bold text-light-text-muted dark:text-dark-text-muted mt-0.5">
              Accountability ledger mapping all captain interactions and financial modifications.
            </span>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          disabled={isLoading}
          className="h-10 px-4 gap-2 font-bold text-xs rounded-xl cursor-pointer bg-white dark:bg-dark-card"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      {/* Filters Card */}
      <Card className="p-5 border border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Captain Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider flex items-center gap-1">
              <User size={12} /> Captain
            </label>
            <select
              value={selectedCaptain}
              onChange={(e) => setSelectedCaptain(e.target.value)}
              className="h-10 px-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm font-semibold text-light-text-main dark:text-dark-text-main focus:outline-none focus:ring-2 focus:ring-brand-green-500/30 transition-all cursor-pointer"
              disabled={isLoadingCaptains}
            >
              <option value="all">All Captains</option>
              {captains.map((cap) => (
                <option key={cap.id} value={cap.id}>
                  {cap.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Type Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider flex items-center gap-1">
              <Activity size={12} /> Action Type
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="h-10 px-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm font-semibold text-light-text-main dark:text-dark-text-main focus:outline-none focus:ring-2 focus:ring-brand-green-500/30 transition-all cursor-pointer"
            >
              <option value="all">All Actions</option>
              <option value="ENTRY_CREATED">Created</option>
              <option value="ENTRY_UPDATED">Edited</option>
              <option value="ENTRY_DELETED">Deleted</option>
              <option value="ENTRY_RESTORED">Restored</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider flex items-center gap-1">
              <Calendar size={12} /> Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 px-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm font-semibold text-light-text-main dark:text-dark-text-main focus:outline-none focus:ring-2 focus:ring-brand-green-500/30 transition-all cursor-pointer"
            />
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider flex items-center gap-1">
              <Calendar size={12} /> End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 px-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm font-semibold text-light-text-main dark:text-dark-text-main focus:outline-none focus:ring-2 focus:ring-brand-green-500/30 transition-all cursor-pointer"
            />
          </div>
        </div>
      </Card>

      {/* Audit Logs Feed */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-gray-200 dark:bg-dark-card rounded-2xl animate-pulse border border-light-border dark:border-dark-border"
              />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-16 text-center border border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-xs">
            <div className="p-4 rounded-full bg-light-bg dark:bg-dark-bg text-light-text-muted dark:text-dark-text-muted mb-4">
              <Search size={32} />
            </div>
            <h3 className="font-extrabold text-base text-light-text-main dark:text-dark-text-main">No Audit Logs Found</h3>
            <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1 max-w-[280px] mx-auto">
              No actions match the selected filters. Try broadening your query criteria.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {logs.map((log) => {
              return (
                <Card
                  key={log.id}
                  className="p-4 border border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-xs hover:border-brand-green-500/25 transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left Section: Time, Captain, Badge */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex flex-col text-left">
                        <span className="text-[11px] font-black text-brand-green-500 dark:text-brand-gold-500 uppercase leading-none">
                          {formatTime(log.timestamp)}
                        </span>
                        <span className="text-[10px] font-bold text-light-text-muted dark:text-dark-text-muted mt-1 leading-none">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>

                      <div className="h-6 w-px bg-light-border dark:bg-dark-border hidden xs:block" />

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-light-text-main dark:text-dark-text-main">
                          {log.captainName}
                        </span>
                        <span className="text-[10px] text-light-text-muted dark:text-dark-text-muted leading-none hidden xs:inline">
                          ({log.user.email})
                        </span>
                      </div>

                      <div className="h-6 w-px bg-light-border dark:bg-dark-border" />

                      {renderActionBadge(log.actionType)}
                    </div>

                    {/* Right Section: Details & Price */}
                    <div className="flex flex-col sm:items-end gap-1 text-left sm:text-right min-w-0 sm:max-w-md">
                      {log.routeInfo && (
                        <span className="text-sm font-black text-light-text-main dark:text-dark-text-main">
                          {log.routeInfo}
                        </span>
                      )}

                      {/* Display Audit Log Diff details */}
                      {log.actionType === "ENTRY_CREATED" && log.ordersCount && log.amount && (
                        <span className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted">
                          {log.ordersCount} {log.ordersCount === 1 ? "Order" : "Orders"} · {formatPrice(log.amount)}
                        </span>
                      )}

                      {log.actionType === "ENTRY_UPDATED" && log.oldValues && log.newValues && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-light-text-muted dark:text-dark-text-muted">
                          <span>Orders:</span>
                          <span className="line-through">{log.oldValues.split("Orders: ")[1]?.split(",")[0]}</span>
                          <ArrowRight size={12} className="text-light-text-muted/60" />
                          <span className="font-bold text-brand-green-500 dark:text-brand-green-400">
                            {log.newValues.split("Orders: ")[1]?.split(",")[0]}
                          </span>
                          <span className="ml-1">•</span>
                          <span className="font-extrabold text-light-text-main dark:text-dark-text-main">
                            {formatPrice(log.amount || 0)}
                          </span>
                        </div>
                      )}

                      {log.actionType === "ENTRY_DELETED" && log.amount && (
                        <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                          Removed {log.ordersCount} {log.ordersCount === 1 ? "Order" : "Orders"} ({formatPrice(log.amount)})
                        </span>
                      )}

                      {log.actionType === "ENTRY_RESTORED" && log.amount && (
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                          Restored {log.ordersCount} {log.ordersCount === 1 ? "Order" : "Orders"} ({formatPrice(log.amount)})
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
