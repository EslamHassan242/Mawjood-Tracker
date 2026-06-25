"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  TrendingUp,
  Navigation,
  Clock,
  Edit2,
  RotateCcw,
  Landmark,
  X,
  Check,
  Plus,
  Minus
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice } from "@/lib/utils";

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

export default function CaptainSummaryPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Totals
  const [tripsCount, setTripsCount] = useState<number>(0);
  const [revenue, setRevenue] = useState<number>(0);

  // Edit Modal State
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editOrdersCount, setEditOrdersCount] = useState<number>(1);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Map of tempId -> actualTripId for toast undos
  const recentTripsRef = useRef<{ [key: string]: string }>({});

  async function fetchData() {
    try {
      // Fetch summary
      const summaryRes = await fetch("/api/trips/summary");
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setTripsCount(summaryData.tripsCount);
        setRevenue(summaryData.revenue);
      }

      // Fetch today's trips to find the last active entry
      const tripsRes = await fetch("/api/trips");
      if (tripsRes.ok) {
        const tripsData = await tripsRes.json();
        setTrips(tripsData.trips || []);
      }
    } catch (err) {
      console.error("Error fetching summary data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const refreshSummaryFromTrips = (updatedTrips: Trip[]) => {
    const activeTrips = updatedTrips.filter((t) => t.status === "ACTIVE");
    const count = activeTrips.reduce((acc, t) => acc + t.ordersCount, 0);
    const rev = activeTrips.reduce((acc, t) => acc + (t.unitPrice * t.ordersCount), 0);
    setTripsCount(count);
    setRevenue(rev);
  };

  // Soft-Delete (Undo) Action
  const handleSoftDelete = async (tripId: string) => {
    // Optimistically update local state to DELETED
    const updated = trips.map((t) =>
      t.id === tripId ? { ...t, status: "DELETED" as const } : t
    );
    setTrips(updated);
    refreshSummaryFromTrips(updated);

    const loadingToast = toast.loading("Undoing trip...");
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "DELETE",
      });
      toast.dismiss(loadingToast);
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Trip undone successfully");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error("Failed to undo trip on server.");
      fetchData();
    }
  };

  // Edit Orders Count
  const openEditModal = (trip: Trip) => {
    setEditingTrip(trip);
    setEditOrdersCount(trip.ordersCount);
  };

  const handleSaveEdit = async () => {
    if (!editingTrip) return;
    setIsSavingEdit(true);

    // Optimistically update
    const updated = trips.map((t) =>
      t.id === editingTrip.id ? { ...t, ordersCount: editOrdersCount } : t
    );
    setTrips(updated);
    refreshSummaryFromTrips(updated);
    setEditingTrip(null);

    try {
      const res = await fetch(`/api/trips/${editingTrip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordersCount: editOrdersCount }),
      });

      if (!res.ok) throw new Error("Edit failed");
      toast.success("Orders count updated");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update trip.");
      fetchData();
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Find the absolute latest active trip
  const lastActiveEntry = trips.find((t) => t.status === "ACTIVE");

  return (
    <div className="flex flex-col gap-5 animate-fade-in-up">
      {/* Title */}
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-bold text-light-text-main dark:text-dark-text-main">
          Today's Summary
        </h2>
        <p className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted">
          Real-time snapshot of your performance and earnings today.
        </p>
      </div>

      {isLoading ? (
        <>
          <Skeleton className="h-32" />
          <Skeleton className="h-44" />
        </>
      ) : (
        <>
          {/* Today Summary Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-green-500 to-brand-green-700 p-6 text-white shadow-lg border border-brand-green-600">
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
              <Navigation size={180} className="rotate-45" />
            </div>
            <div className="flex flex-col gap-4 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-brand-green-100 uppercase tracking-wider">
                  Today's Metrics
                </span>
                <span className="flex items-center gap-1 text-xs font-bold bg-white/15 px-2 py-0.5 rounded-full backdrop-blur-md">
                  <TrendingUp size={12} /> Live
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 divide-x divide-white/10 mt-1">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-brand-green-100/80">
                    Total Trips
                  </span>
                  <span className="text-4xl font-black mt-1 tracking-tight">
                    {tripsCount}
                  </span>
                </div>
                <div className="flex flex-col pl-4">
                  <span className="text-xs font-semibold text-brand-green-100/80">
                    Total Earnings
                  </span>
                  <span className="text-4xl font-black mt-1 tracking-tight">
                    {formatPrice(revenue)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Last Recorded Entry Card */}
          {lastActiveEntry ? (
            <Card className="p-5 border border-brand-green-500/20 bg-brand-green-50/10 dark:bg-brand-green-500/5 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 h-1.5 w-full bg-brand-green-500" />
              
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-brand-green-600 dark:text-brand-gold-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock size={12} /> Last Recorded Entry
                  </h3>
                  <span className="text-[10px] font-bold text-light-text-muted dark:text-dark-text-muted">
                    {new Date(lastActiveEntry.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-base font-extrabold text-light-text-main dark:text-dark-text-main leading-tight">
                      {lastActiveEntry.route.fromArea.name} → {lastActiveEntry.route.toArea.name}
                    </span>
                    <span className="text-xs font-bold text-light-text-muted dark:text-dark-text-muted mt-0.5">
                      {lastActiveEntry.ordersCount} {lastActiveEntry.ordersCount === 1 ? "Order" : "Orders"} · {formatPrice(lastActiveEntry.unitPrice)} each
                    </span>
                  </div>
                  <span className="text-lg font-black text-brand-green-500 dark:text-brand-green-100">
                    {formatPrice(lastActiveEntry.unitPrice * lastActiveEntry.ordersCount)}
                  </span>
                </div>

                <div className="flex items-center gap-2 border-t border-light-border dark:border-dark-border/60 pt-3 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(lastActiveEntry)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    <Edit2 size={12} /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSoftDelete(lastActiveEntry.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl font-bold text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
                  >
                    <RotateCcw size={12} /> Undo
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center p-8 text-center text-light-text-muted dark:text-dark-text-muted">
              <p className="font-semibold text-sm">No active trips logged today.</p>
              <p className="text-xs mt-1">Navigate to the Routes screen to tap and log your first delivery!</p>
            </Card>
          )}
        </>
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

            <div className="flex justify-between items-center p-3 rounded-xl bg-light-bg dark:bg-dark-bg/60 border border-light-border dark:border-dark-border text-xs font-bold">
              <span className="text-light-text-muted dark:text-dark-text-muted">Route Unit Price:</span>
              <span className="text-brand-green-500 dark:text-brand-green-100">{formatPrice(editingTrip.unitPrice)}</span>
            </div>

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

            <div className="text-center">
              <span className="text-xs font-bold text-light-text-muted dark:text-dark-text-muted block">Estimated Revenue</span>
              <span className="text-2xl font-black text-brand-green-500 dark:text-brand-green-100">
                {formatPrice(editingTrip.unitPrice * editOrdersCount)}
              </span>
            </div>

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
