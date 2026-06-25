"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Play,
  RotateCcw,
  TrendingUp,
  Navigation,
  Edit2,
  Trash2,
  Clock,
  Plus,
  Minus,
  Check,
  X,
  ClipboardList
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatPrice } from "@/lib/utils";

interface Area {
  id: string;
  name: string;
}

interface Route {
  id: string;
  fromArea: Area;
  toArea: Area;
  price: number;
}

interface Trip {
  id: string;
  captainId: string;
  routeId: string;
  unitPrice: number;
  ordersCount: number;
  status: "ACTIVE" | "DELETED";
  createdAt: string;
  route: Route;
}

interface CaptainHomeClientProps {
  initialRoutes: Route[];
}

export const CaptainHomeClient: React.FC<CaptainHomeClientProps> = ({
  initialRoutes,
}) => {
  // Today's trips list state
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);

  // Totals
  const [tripsCount, setTripsCount] = useState<number>(0);
  const [revenue, setRevenue] = useState<number>(0);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  // Active tapped card for ripple animation
  const [activeTapCardId, setActiveTapCardId] = useState<string | null>(null);

  // Edit Modal State
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editOrdersCount, setEditOrdersCount] = useState<number>(1);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Map of tempId -> actualTripId for toast undos
  const recentTripsRef = useRef<{ [key: string]: string }>({});

  // Fetch today's summary and trips list on mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch summary
        const summaryRes = await fetch("/api/trips/summary");
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          setTripsCount(summaryData.tripsCount);
          setRevenue(summaryData.revenue);
        }

        // Fetch today's trips
        const tripsRes = await fetch("/api/trips");
        if (tripsRes.ok) {
          const tripsData = await tripsRes.json();
          setTrips(tripsData.trips || []);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsLoadingSummary(false);
        setIsLoadingTrips(false);
      }
    }
    fetchData();
  }, []);

  // Update summary counts based on the current trips state
  const refreshSummaryFromTrips = (updatedTrips: Trip[]) => {
    const activeTrips = updatedTrips.filter((t) => t.status === "ACTIVE");
    const count = activeTrips.reduce((acc, t) => acc + t.ordersCount, 0);
    const rev = activeTrips.reduce((acc, t) => acc + (t.unitPrice * t.ordersCount), 0);
    setTripsCount(count);
    setRevenue(rev);
  };

  // 1. Fast Tap Recording
  const handleRecordTrip = async (route: Route) => {
    const tempId = Math.random().toString(36).substring(2, 9);
    
    // Play card animation
    setActiveTapCardId(route.id);
    setTimeout(() => setActiveTapCardId(null), 300);

    // Optimistic trip object
    const optimisticTrip: Trip = {
      id: tempId,
      captainId: "temp",
      routeId: route.id,
      unitPrice: route.price,
      ordersCount: 1,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      route: route,
    };

    // Prepend to trips list
    const updatedTrips = [optimisticTrip, ...trips];
    setTrips(updatedTrips);
    refreshSummaryFromTrips(updatedTrips);

    let isUndone = false;

    // Toast alert with 10s Undo
    const toastId = toast.success(
      <div className="flex flex-col gap-0.5">
        <span className="font-bold text-sm text-brand-green-700 dark:text-brand-green-100">
          Trip recorded successfully!
        </span>
        <span className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted">
          {route.fromArea.name} → {route.toArea.name} (1 Order · {formatPrice(route.price)})
        </span>
      </div>,
      {
        action: {
          label: "Undo",
          onClick: async () => {
            isUndone = true;
            await handleSoftDelete(tempId, route.price, true);
          },
        },
        duration: 10000,
      }
    );

    // POST to API in background
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId: route.id, ordersCount: 1 }),
      });

      if (!res.ok) throw new Error("Failed to save trip");

      const data = await res.json();
      const actualTrip = data.trip;

      // Map tempId to actualId
      recentTripsRef.current[tempId] = actualTrip.id;

      // Swap tempId with actual ID in the list
      setTrips((prev) =>
        prev.map((t) => (t.id === tempId ? { ...actualTrip, route } : t))
      );

      if (isUndone) {
        await handleSoftDelete(actualTrip.id, route.price, false);
      }
    } catch (err) {
      console.error(err);
      if (!isUndone) {
        // Roll back on error
        const rolledBack = trips.filter((t) => t.id !== tempId);
        setTrips(rolledBack);
        refreshSummaryFromTrips(rolledBack);
        toast.dismiss(toastId);
        toast.error("Failed to record trip. Connection error.");
      }
    }
  };

  // 2. Soft-Delete (Undo / Delete) Action
  const handleSoftDelete = async (tripId: string, price: number, isTemp: boolean = false) => {
    // If it is a temporary ID, we might need to wait for the actual ID
    let targetId = tripId;
    if (isTemp) {
      const actualId = recentTripsRef.current[tripId];
      if (actualId) {
        targetId = actualId;
      } else {
        // Poll briefly if the API response is still pending
        let attempts = 0;
        const interval = setInterval(async () => {
          const polledId = recentTripsRef.current[tripId];
          attempts++;
          if (polledId) {
            clearInterval(interval);
            await performDeleteAPI(polledId);
          } else if (attempts > 20) {
            clearInterval(interval);
            toast.error("Could not undo. Record not found on server.");
          }
        }, 200);
        
        // Optimistically set the status to DELETED locally
        const updated = trips.map((t) =>
          t.id === tripId ? { ...t, status: "DELETED" as const } : t
        );
        setTrips(updated);
        refreshSummaryFromTrips(updated);
        return;
      }
    }

    // Optimistically update local state to DELETED
    const updated = trips.map((t) =>
      t.id === targetId ? { ...t, status: "DELETED" as const } : t
    );
    setTrips(updated);
    refreshSummaryFromTrips(updated);

    await performDeleteAPI(targetId);
  };

  const performDeleteAPI = async (actualId: string) => {
    const loadingToast = toast.loading("Processing delete...");
    try {
      const res = await fetch(`/api/trips/${actualId}`, {
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
      // Fetch latest today's trips to sync state
      const syncRes = await fetch("/api/trips");
      if (syncRes.ok) {
        const syncData = await syncRes.json();
        setTrips(syncData.trips || []);
        refreshSummaryFromTrips(syncData.trips || []);
      }
    }
  };

  // 3. Restore / Recover Deleted Trip
  const handleRestore = async (tripId: string) => {
    // Optimistically restore
    const updated = trips.map((t) =>
      t.id === tripId ? { ...t, status: "ACTIVE" as const } : t
    );
    setTrips(updated);
    refreshSummaryFromTrips(updated);

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
      // Roll back
      const rolledBack = trips.map((t) =>
        t.id === tripId ? { ...t, status: "DELETED" as const } : t
      );
      setTrips(rolledBack);
      refreshSummaryFromTrips(rolledBack);
    }
  };

  // 4. Edit Orders Count
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
      toast.success("Orders count updated", { icon: <Check size={15} /> });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update trip on server.");
      // Sync from server
      const syncRes = await fetch("/api/trips");
      if (syncRes.ok) {
        const syncData = await syncRes.json();
        setTrips(syncData.trips || []);
        refreshSummaryFromTrips(syncData.trips || []);
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Absolute latest active trip
  const lastActiveEntry = trips.find((t) => t.status === "ACTIVE");

  return (
    <>
      {/* Today Summary Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-green-500 to-brand-green-700 p-6 text-white shadow-lg border border-brand-green-600">
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
          <Navigation size={180} className="rotate-45" />
        </div>
        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-brand-green-100 uppercase tracking-wider">
              Today Summary
            </span>
            <span className="flex items-center gap-1 text-xs font-bold bg-white/15 px-2 py-0.5 rounded-full backdrop-blur-md">
              <TrendingUp size={12} /> Active
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 divide-x divide-white/10 mt-1">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-brand-green-100/80">
                Today's Trips
              </span>
              <span className="text-4xl font-black mt-1 tracking-tight animate-count-up">
                {isLoadingSummary ? "..." : tripsCount}
              </span>
            </div>
            <div className="flex flex-col pl-4">
              <span className="text-xs font-semibold text-brand-green-100/80">
                Today's Revenue
              </span>
              <span className="text-4xl font-black mt-1 tracking-tight animate-count-up">
                {isLoadingSummary ? "..." : formatPrice(revenue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Persistent Last Recorded Entry Card */}
      {lastActiveEntry && (
        <Card className="p-5 border border-brand-green-500/20 bg-brand-green-50/10 dark:bg-brand-green-500/5 shadow-md relative overflow-hidden animate-fade-in-up">
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
                onClick={() => handleSoftDelete(lastActiveEntry.id, lastActiveEntry.unitPrice)}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl font-bold text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
              >
                <RotateCcw size={12} /> Undo
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Route Section Header */}
      <div className="flex flex-col gap-1 mt-2">
        <h2 className="text-base font-extrabold text-light-text-main dark:text-dark-text-main uppercase tracking-wider">
          Route Grid
        </h2>
        <p className="text-xs font-bold text-light-text-muted dark:text-dark-text-muted">
          Tap a route card below to instantly record a completed trip.
        </p>
      </div>

      {/* Route Cards Grid */}
      {initialRoutes.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center text-light-text-muted dark:text-dark-text-muted">
          <p className="font-semibold text-sm">No active routes available.</p>
          <p className="text-xs mt-1">Please contact your administrator to set up routes.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {initialRoutes.map((route) => {
            const isTapped = activeTapCardId === route.id;
            return (
              <button
                key={route.id}
                onClick={() => handleRecordTrip(route)}
                className="w-full text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-green-500/50 rounded-2xl active:scale-95 transition-transform duration-100"
              >
                <Card
                  className={`flex flex-col justify-between h-28 p-4 border border-light-border dark:border-dark-border shadow-sm select-none transition-all duration-300 ${
                    isTapped
                      ? "animate-tap-pulse bg-brand-green-50 dark:bg-brand-green-500/10 border-brand-green-500"
                      : "bg-white dark:bg-dark-card hover:border-brand-green-500/30"
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-light-text-main dark:text-dark-text-main line-clamp-1">
                      {route.fromArea.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-black text-brand-gold-600 dark:text-brand-gold-500 uppercase tracking-widest leading-none">
                        to
                      </span>
                      <span className="text-sm font-bold text-light-text-main dark:text-dark-text-main line-clamp-1">
                        {route.toArea.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-end mt-2">
                    <span className="text-base font-extrabold text-brand-green-500 dark:text-brand-green-100">
                      {formatPrice(route.price)}
                    </span>
                    <div className="p-1.5 rounded-lg bg-light-bg dark:bg-dark-bg/60 text-brand-green-500/60 dark:text-brand-green-100/40">
                      <Play size={12} fill="currentColor" className="ml-[1px]" />
                    </div>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Today's Activity Section */}
      <div className="flex flex-col gap-3 mt-4">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-light-text-muted dark:text-dark-text-muted" />
          <h2 className="text-base font-extrabold text-light-text-main dark:text-dark-text-main uppercase tracking-wider">
            Today's Activity
          </h2>
        </div>

        {isLoadingTrips ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-dark-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-6 text-center text-light-text-muted dark:text-dark-text-muted">
            <p className="font-semibold text-xs">No entries recorded today.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            {trips.map((trip) => {
              const isDeleted = trip.status === "DELETED";
              return (
                <Card
                  key={trip.id}
                  className={`p-3.5 flex items-center justify-between border shadow-xs transition-all duration-300 rounded-xl ${
                    isDeleted
                      ? "bg-gray-100/40 border-dashed dark:bg-dark-card/20 border-light-border/60 dark:border-dark-border/40 opacity-50"
                      : "bg-white dark:bg-dark-card border-light-border dark:border-dark-border"
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span
                      className={`text-sm font-bold text-light-text-main dark:text-dark-text-main truncate ${
                        isDeleted ? "line-through" : ""
                      }`}
                    >
                      {trip.route.fromArea.name} → {trip.route.toArea.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] font-semibold text-light-text-muted dark:text-dark-text-muted">
                      <span>
                        {trip.ordersCount} {trip.ordersCount === 1 ? "order" : "orders"}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(trip.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-black text-light-text-main dark:text-dark-text-main ${
                        isDeleted ? "line-through text-light-text-muted/60" : ""
                      }`}
                    >
                      {formatPrice(trip.unitPrice * trip.ordersCount)}
                    </span>

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
                            onClick={() => handleSoftDelete(trip.id, trip.unitPrice)}
                            className="h-8 w-8 p-0 rounded-lg text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center cursor-pointer"
                            title="Delete Trip"
                          >
                            <Trash2 size={12} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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
    </>
  );
};

export default CaptainHomeClient;
