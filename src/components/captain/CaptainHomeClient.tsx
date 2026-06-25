"use client";

import React, { useState, useRef } from "react";
import { toast } from "sonner";
import { Play, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
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
  // Session-based trips logged in the current view to support the 10-second undo toast
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTapCardId, setActiveTapCardId] = useState<string | null>(null);
  const recentTripsRef = useRef<{ [key: string]: string }>({});

  // Fast Tap Recording
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

    // Prepend to current session trips
    setTrips((prev) => [optimisticTrip, ...prev]);

    let isUndone = false;

    // Toast alert with 10s Undo
    const toastId = toast.success(
      <div className="flex flex-col gap-0.5 text-left">
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
            await handleSoftDelete(tempId, true);
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

      // Swap tempId with actual ID in session trips
      setTrips((prev) =>
        prev.map((t) => (t.id === tempId ? { ...actualTrip, route } : t))
      );

      if (isUndone) {
        await handleSoftDelete(actualTrip.id, false);
      }
    } catch (err) {
      console.error(err);
      if (!isUndone) {
        // Roll back on error
        setTrips((prev) => prev.filter((t) => t.id !== tempId));
        toast.dismiss(toastId);
        toast.error("Failed to record trip. Connection error.");
      }
    }
  };

  // Soft-Delete (Undo) Action
  const handleSoftDelete = async (tripId: string, isTemp: boolean = false) => {
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
        
        // Optimistically set status to DELETED locally
        setTrips((prev) =>
          prev.map((t) => (t.id === tripId ? { ...t, status: "DELETED" as const } : t))
        );
        return;
      }
    }

    // Optimistically set status to DELETED locally
    setTrips((prev) =>
      prev.map((t) => (t.id === targetId ? { ...t, status: "DELETED" as const } : t))
    );

    await performDeleteAPI(targetId);
  };

  const performDeleteAPI = async (actualId: string) => {
    const loadingToast = toast.loading("Processing undo...");
    try {
      const res = await fetch(`/api/trips/${actualId}`, {
        method: "DELETE",
      });
      toast.dismiss(loadingToast);
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Trip undone successfully", {
        icon: <RotateCcw size={15} className="text-brand-green-500" />,
      });
    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error("Failed to undo trip on server.");
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in-up">
      {/* Route Section Header */}
      <div className="flex flex-col gap-1">
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
                className="w-full text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-green-500/50 rounded-2xl active:scale-95 transition-transform duration-100 animate-fade-in"
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
    </div>
  );
};

export default CaptainHomeClient;
