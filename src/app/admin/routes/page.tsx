"use client";

import React, { useState, useEffect } from "react";
import { Map, MapPin, Plus, DollarSign, Edit, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

interface Area {
  id: string;
  name: string;
}

interface Route {
  id: string;
  fromAreaId: string;
  toAreaId: string;
  fromArea: Area;
  toArea: Area;
  price: number;
  isActive: boolean;
  tripsCount: number;
}

export default function AdminRoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Route Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [fromAreaId, setFromAreaId] = useState("");
  const [toAreaId, setToAreaId] = useState("");
  const [price, setPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Price Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Fetch routes and areas
  async function fetchData() {
    try {
      const [routesRes, areasRes] = await Promise.all([
        fetch("/api/admin/routes"),
        fetch("/api/admin/areas"),
      ]);

      if (routesRes.ok && areasRes.ok) {
        const routesData = await routesRes.json();
        const areasData = await areasRes.json();
        setRoutes(routesData.routes);
        setAreas(areasData.areas);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Failed to load routes data");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Handle adding a new route
  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAreaId || !toAreaId || !price) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromAreaId, toAreaId, price }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create route");
      }

      toast.success("Route created successfully");
      setIsAddModalOpen(false);

      // Reset form
      setFromAreaId("");
      setToAreaId("");
      setPrice("");

      // Refresh list
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle editing route price
  const handleEditPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute || !editPrice) return;

    setIsEditing(true);
    try {
      const res = await fetch(`/api/admin/routes/${editingRoute.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: editPrice }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update route price");
      }

      toast.success("Route price updated successfully");
      setIsEditModalOpen(false);
      setEditingRoute(null);
      setEditPrice("");

      // Refresh list
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred");
    } finally {
      setIsEditing(false);
    }
  };

  // Handle toggling active status
  const handleToggleActive = async (route: Route) => {
    const newStatus = !route.isActive;
    try {
      const res = await fetch(`/api/admin/routes/${route.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to toggle route status");
      }

      // Update state directly for smooth UI
      setRoutes((prev) =>
        prev.map((r) => (r.id === route.id ? { ...r, isActive: newStatus } : r))
      );

      toast.success(`Route ${newStatus ? "activated" : "deactivated"} successfully`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred");
    }
  };

  // Handle deleting route
  const handleDeleteRoute = async (route: Route) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the route from ${route.fromArea.name} to ${route.toArea.name}?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/routes/${route.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete route");
      }

      toast.success("Route deleted successfully");
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Title section */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-black text-light-text-main dark:text-dark-text-main tracking-tight">
            Delivery Routes
          </h2>
          <p className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted">
            Configure transit lines, adjust pricing, and toggle route visibility.
          </p>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Route</span>
        </Button>
      </div>

      {/* Routes List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : routes.length === 0 ? (
        <EmptyState
          title="No routes found"
          description="There are no delivery routes defined in the system yet."
          icon={<Map size={40} />}
          action={<Button onClick={() => setIsAddModalOpen(true)}>Create Route</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {routes.map((route) => (
            <Card
              key={route.id}
              className={`p-4 border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all ${
                !route.isActive && "opacity-60 dark:opacity-50"
              }`}
            >
              {/* Route Info */}
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl flex items-center justify-center ${
                  route.isActive
                    ? "bg-brand-green-50 text-brand-green-500 dark:bg-brand-green-500/10 dark:text-brand-green-100"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                }`}>
                  <Map size={18} />
                </div>
                
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 font-bold text-sm text-light-text-main dark:text-dark-text-main">
                    <span>{route.fromArea.name}</span>
                    <span className="text-[10px] font-black text-brand-gold-600 dark:text-brand-gold-500 uppercase tracking-widest leading-none">
                      to
                    </span>
                    <span>{route.toArea.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2.5 mt-1 select-none">
                    <Badge variant={route.isActive ? "success" : "neutral"} className="text-[9px] uppercase font-bold py-0 px-1.5">
                      {route.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <span className="text-[10px] font-semibold text-light-text-muted dark:text-dark-text-muted">
                      {route.tripsCount} active {route.tripsCount === 1 ? "trip" : "trips"} recorded
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing & Actions */}
              <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 border-light-border dark:border-dark-border/40 pt-3 sm:pt-0">
                {/* Price Display and Edit */}
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-brand-green-500 dark:text-brand-green-100">
                    {formatPrice(route.price)}
                  </span>
                  <button
                    onClick={() => {
                      setEditingRoute(route);
                      setEditPrice(String(route.price));
                      setIsEditModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-light-text-muted/70 hover:bg-gray-100 dark:hover:bg-dark-border hover:text-light-text-main dark:hover:text-dark-text-main cursor-pointer"
                    title="Edit Price"
                  >
                    <Edit size={14} />
                  </button>
                </div>

                {/* Status Toggle & Delete Actions */}
                <div className="flex items-center gap-2">
                  {/* Toggle Button */}
                  <button
                    onClick={() => handleToggleActive(route)}
                    className="text-light-text-muted hover:text-brand-green-500 dark:hover:text-brand-green-100 cursor-pointer transition-all active:scale-95"
                    title={route.isActive ? "Deactivate Route" : "Activate Route"}
                  >
                    {route.isActive ? (
                      <ToggleRight size={26} className="text-brand-green-500 dark:text-brand-green-500" />
                    ) : (
                      <ToggleLeft size={26} className="text-gray-400 dark:text-gray-600" />
                    )}
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteRoute(route)}
                    className="p-1.5 rounded-lg text-red-500/70 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 cursor-pointer"
                    title="Delete Route"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Route Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Transit Route"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="add-route-form" isLoading={isSubmitting}>
              Create Route
            </Button>
          </>
        }
      >
        <form id="add-route-form" onSubmit={handleAddRoute} className="flex flex-col gap-4">
          <p className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted mb-1">
            Configure a route between two predefined areas. Self-loops (e.g., Rehab → Rehab) are fully supported.
          </p>

          {/* From Area */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-light-text-main/80 dark:text-dark-text-main/80 flex items-center gap-1">
              <MapPin size={14} className="text-brand-green-500" />
              <span>From Area</span>
            </label>
            <select
              value={fromAreaId}
              onChange={(e) => setFromAreaId(e.target.value)}
              className="w-full rounded-xl border border-light-border dark:border-dark-border px-4 py-2.5 bg-white dark:bg-dark-card text-light-text-main dark:text-dark-text-main focus:outline-none focus:border-brand-green-500 font-semibold text-sm"
              required
              disabled={isSubmitting}
            >
              <option value="">-- Select Departure Area --</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* To Area */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-light-text-main/80 dark:text-dark-text-main/80 flex items-center gap-1">
              <MapPin size={14} className="text-brand-gold-500" />
              <span>To Area</span>
            </label>
            <select
              value={toAreaId}
              onChange={(e) => setToAreaId(e.target.value)}
              className="w-full rounded-xl border border-light-border dark:border-dark-border px-4 py-2.5 bg-white dark:bg-dark-card text-light-text-main dark:text-dark-text-main focus:outline-none focus:border-brand-green-500 font-semibold text-sm"
              required
              disabled={isSubmitting}
            >
              <option value="">-- Select Destination Area --</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Price */}
          <Input
            label="Route Price (EGP)"
            type="number"
            placeholder="e.g. 35"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            icon={<DollarSign size={18} />}
            required
            min="0"
            step="0.5"
            disabled={isSubmitting}
          />
        </form>
      </Modal>

      {/* Edit Price Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingRoute(null);
          setEditPrice("");
        }}
        title="Adjust Route Pricing"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingRoute(null);
                setEditPrice("");
              }}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button type="submit" form="edit-price-form" isLoading={isEditing}>
              Save Price
            </Button>
          </>
        }
      >
        <form id="edit-price-form" onSubmit={handleEditPrice} className="flex flex-col gap-4">
          {editingRoute && (
            <div className="p-3.5 bg-light-bg dark:bg-dark-bg/60 border border-light-border dark:border-dark-border rounded-xl flex items-center justify-between text-xs font-semibold mb-1">
              <span className="text-light-text-muted dark:text-dark-text-muted">Route Path:</span>
              <span className="text-light-text-main dark:text-dark-text-main font-bold">
                {editingRoute.fromArea.name} → {editingRoute.toArea.name}
              </span>
            </div>
          )}

          <Input
            label="Updated Delivery Price (EGP)"
            type="number"
            placeholder="e.g. 40"
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value)}
            icon={<DollarSign size={18} />}
            required
            min="0"
            step="0.5"
            disabled={isEditing}
          />
        </form>
      </Modal>
    </div>
  );
}
