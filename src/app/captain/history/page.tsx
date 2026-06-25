"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Clock,
  ArrowRight,
  Edit2,
  Trash2,
  RotateCcw,
  Plus,
  Minus,
  Check,
  X
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
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
  ordersCount: number;
  status: "ACTIVE" | "DELETED";
  createdAt: string;
  route: Route;
}

export default function CaptainHistoryPage() {
  const [filter, setFilter] = useState<"today" | "yesterday" | "custom">("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal State
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editOrdersCount, setEditOrdersCount] = useState<number>(1);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Set default custom dates (current day)
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    setStartDate(todayStr);
    setEndDate(todayStr);
  }, []);

  // Fetch trips callback
  const fetchTrips = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = `/api/trips?filter=${filter}`;
      if (filter === "today") {
        url += `&includeDeleted=true`;
      }
      if (filter === "custom" && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTrips(data.trips || []);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filter, startDate, endDate]);

  // Fetch trips on filter or date change
  useEffect(() => {
    if (filter !== "custom" || (startDate && endDate)) {
      fetchTrips();
    }
  }, [filter, startDate, endDate, fetchTrips]);

  // Soft-Delete (Delete) Action
  const handleSoftDelete = async (tripId: string) => {
    // Optimistically update local state to DELETED
    const updated = trips.map((t) =>
      t.id === tripId ? { ...t, status: "DELETED" as const } : t
    );
    setTrips(updated);

    const loadingToast = toast.loading("Processing delete...");
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "DELETE",
      });
      toast.dismiss(loadingToast);
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Trip marked as deleted", {
        icon: <Trash2 size={15} className="text-red-500" />,
      });
    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error("Failed to delete trip on server.");
      fetchTrips();
    }
  };

  // Restore / Recover Deleted Trip
  const handleRestore = async (tripId: string) => {
    // Optimistically restore
    const updated = trips.map((t) =>
      t.id === tripId ? { ...t, status: "ACTIVE" as const } : t
    );
    setTrips(updated);

    const loadingToast = toast.loading("Restoring entry...");
    try {
      const res = await fetch(`/api/trips/${tripId}/restore`, {
        method: "POST",
      });
      toast.dismiss(loadingToast);
      if (!res.ok) throw new Error("Restore failed");
      toast.success("Trip restored successfully", {
        icon: <RotateCcw size={15} className="text-brand-green-500" />,
      });
    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error("Failed to restore trip.");
      fetchTrips();
    }
  };

  // Edit Orders Count
  const openEditModal = (trip: Trip) => {
    setEditingTrip(trip);
    setEditOrdersCount(trip.ordersCount || 1);
  };

  const handleSaveEdit = async () => {
    if (!editingTrip) return;
    setIsSavingEdit(true);

    // Optimistically update
    const updated = trips.map((t) =>
      t.id === editingTrip.id ? { ...t, ordersCount: editOrdersCount } : t
    );
    setTrips(updated);
    setEditingTrip(null);

    try {
      const res = await fetch(`/api/trips/${editingTrip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordersCount: editOrdersCount }),
      });

      if (!res.ok) throw new Error("Edit failed");
      toast.success("Orders count updated", { icon: <Check size={15} /> });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update trip on server.");
      fetchTrips();
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Calculate totals (only active trips count)
  const activeTrips = trips.filter((t) => t.status !== "DELETED");
  const totalTripsCount = activeTrips.reduce((acc, t) => acc + (t.ordersCount || 1), 0);
  const totalRevenue = activeTrips.reduce((acc, t) => acc + (t.unitPrice * (t.ordersCount || 1)), 0);

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
        ) : trips.length === 0 ? (
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
          trips.map((trip) => {
            const isDeleted = trip.status === "DELETED";
            const isToday = filter === "today";

            return (
              <Card
                key={trip.id}
                className={`p-4 border flex items-center justify-between shadow-xs transition-all duration-300 rounded-xl ${
                  isDeleted
                    ? "bg-gray-100/40 border-dashed dark:bg-dark-card/20 border-light-border/60 dark:border-dark-border/40 opacity-50"
                    : "bg-white dark:bg-dark-card border-light-border dark:border-dark-border hover:border-brand-green-500/10"
                }`}
              >
                {/* Left: Time and Route */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Time badge */}
                  <div className="flex flex-col items-center justify-center bg-light-bg dark:bg-dark-bg/50 px-2.5 py-1.5 rounded-xl text-light-text-muted dark:text-dark-text-muted border border-light-border/40 dark:border-dark-border/40 select-none shrink-0">
                    <Clock size={12} className="mb-0.5" />
                    <span className="text-[10px] font-bold tracking-tight">
                      {formatTime(trip.createdAt)}
                    </span>
                  </div>

                  {/* Route label */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-sm font-bold text-light-text-main dark:text-dark-text-main truncate ${isDeleted ? "line-through" : ""}`}>
                        {trip.route.fromArea.name}
                      </span>
                      <ArrowRight size={12} className="text-light-text-muted/60 dark:text-dark-text-muted/60 shrink-0" />
                      <span className={`text-sm font-bold text-light-text-main dark:text-dark-text-main truncate ${isDeleted ? "line-through" : ""}`}>
                        {trip.route.toArea.name}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] font-semibold text-light-text-muted/70 dark:text-dark-text-muted/70">
                      <span>
                        {trip.ordersCount || 1} { (trip.ordersCount || 1) === 1 ? "order" : "orders" }
                      </span>
                      <span>•</span>
                      <span>
                        {formatDateShort(trip.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Price & Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-base font-extrabold text-brand-green-500 dark:text-brand-green-100 ${isDeleted ? "line-through opacity-60" : ""}`}>
                    {formatPrice(trip.unitPrice * (trip.ordersCount || 1))}
                  </span>

                  {/* Edit/Delete Actions (Only for Today tab) */}
                  {isToday && (
                    <div className="flex items-center gap-1 border-l border-light-border dark:border-dark-border pl-2.5 ml-0.5">
                      {isDeleted ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(trip.id)}
                          className="h-8 w-8 p-0 rounded-lg text-brand-green-500 dark:text-brand-green-400 border-brand-green-200 dark:border-brand-green-500/20 hover:bg-brand-green-50 dark:hover:bg-brand-green-500/10 flex items-center justify-center cursor-pointer"
                          title="Restore Trip"
                        >
                          <RotateCcw size={13} />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(trip)}
                            className="h-8 w-8 p-0 rounded-lg flex items-center justify-center cursor-pointer"
                            title="Edit Trip"
                          >
                            <Edit2 size={12} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSoftDelete(trip.id)}
                            className="h-8 w-8 p-0 rounded-lg text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center cursor-pointer"
                            title="Delete Trip"
                          >
                            <Trash2 size={12} />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Floating Bottom Totals Summary */}
      {!isLoading && totalTripsCount > 0 && (
        <Card className="fixed bottom-16 left-0 right-0 max-w-md mx-auto z-35 rounded-t-2xl border-t border-x border-light-border dark:border-dark-border bg-white/95 dark:bg-dark-card/95 backdrop-blur-md px-5 py-4 flex justify-between items-center shadow-lg animate-toast-slide">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">
              Total Output
            </span>
            <span className="text-sm font-black text-light-text-main dark:text-dark-text-main">
              {totalTripsCount} {totalTripsCount === 1 ? "Trip" : "Trips"} Completed
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

      {/* Edit Orders Count Modal */}
      {editingTrip && (
        <Modal
          isOpen={!!editingTrip}
          onClose={() => setEditingTrip(null)}
          title="Edit Entry Orders"
          className="max-w-[340px]"
        >
          <div className="flex flex-col gap-4 py-2">
            <p className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted text-center">
              Update the orders count for the delivery route:<br />
              <strong className="text-sm font-extrabold text-light-text-main dark:text-dark-text-main block mt-1">
                {editingTrip.route.fromArea.name} → {editingTrip.route.toArea.name}
              </strong>
            </p>

            {/* Price Snapshot Info */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-light-bg dark:bg-dark-bg/60 border border-light-border dark:border-dark-border text-xs font-bold">
              <span className="text-light-text-muted dark:text-dark-text-muted">Route Unit Price:</span>
              <span className="text-brand-green-500 dark:text-brand-green-100">{formatPrice(editingTrip.unitPrice)}</span>
            </div>

            {/* Orders Quantity Selector */}
            <div className="flex items-center justify-center gap-5 my-2">
              <button
                type="button"
                onClick={() => setEditOrdersCount((c) => Math.max(1, c - 1))}
                className="w-11 h-11 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-dark-border text-light-text-main dark:text-dark-text-main border border-light-border dark:border-dark-border hover:bg-gray-200 cursor-pointer active:scale-90 transition-all"
              >
                <Minus size={16} />
              </button>
              
              <span className="text-3xl font-black text-light-text-main dark:text-dark-text-main w-12 text-center select-none">
                {editOrdersCount}
              </span>

              <button
                type="button"
                onClick={() => setEditOrdersCount((c) => c + 1)}
                className="w-11 h-11 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-dark-border text-light-text-main dark:text-dark-text-main border border-light-border dark:border-dark-border hover:bg-gray-200 cursor-pointer active:scale-90 transition-all"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Total Amount Preview */}
            <div className="text-center">
              <span className="text-xs font-bold text-light-text-muted dark:text-dark-text-muted block">Estimated Revenue</span>
              <span className="text-2xl font-black text-brand-green-500 dark:text-brand-green-100">
                {formatPrice(editingTrip.unitPrice * editOrdersCount)}
              </span>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                onClick={() => setEditingTrip(null)}
                className="flex-1 rounded-xl h-11 font-bold cursor-pointer"
                disabled={isSavingEdit}
              >
                <X size={14} className="mr-1" /> Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="flex-1 rounded-xl h-11 bg-brand-green-500 hover:bg-brand-green-600 text-white font-bold cursor-pointer"
                disabled={isSavingEdit}
              >
                <Check size={14} className="mr-1" /> {isSavingEdit ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
