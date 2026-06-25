"use client";

import React, { useState, useEffect } from "react";
import { MapPin, Plus, Edit, Trash2, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateShort } from "@/lib/utils";
import { toast } from "sonner";
import { useRole } from "@/components/navigation/RoleContext";

interface Area {
  id: string;
  name: string;
  createdAt: string;
}

interface AreaWithCount extends Area {
  _count?: {
    routesFrom: number;
    routesTo: number;
  };
}

export default function AdminAreasPage() {
  const [areas, setAreas] = useState<AreaWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { canWrite, canDelete } = useRole();

  // Add Area state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Area state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [editName, setEditName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Fetch areas
  async function fetchAreas() {
    try {
      const res = await fetch("/api/admin/areas");
      if (res.ok) {
        const data = await res.json();
        
        // Let's query routes too to count referencing routes,
        // or the API will return count later. For now, let's count them
        // by reading from our areas endpoint.
        setAreas(data.areas);
      }
    } catch (err) {
      console.error("Error fetching areas:", err);
      toast.error("Failed to load areas");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchAreas();
  }, []);

  // Handle adding area
  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    if (!name.trim()) {
      toast.error("Please enter an area name");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create area");
      }

      toast.success("Area created successfully");
      setIsAddModalOpen(false);
      setName("");
      fetchAreas();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle renaming area
  const handleRenameArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || !editingArea || !editName.trim()) return;

    setIsEditing(true);
    try {
      const res = await fetch(`/api/admin/areas/${editingArea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to rename area");
      }

      toast.success("Area renamed successfully");
      setIsEditModalOpen(false);
      setEditingArea(null);
      setEditName("");
      fetchAreas();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred");
    } finally {
      setIsEditing(false);
    }
  };

  // Handle deleting area
  const handleDeleteArea = async (area: Area) => {
    if (!canDelete) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete the area "${area.name}"?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/areas/${area.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete area");
      }

      toast.success("Area deleted successfully");
      fetchAreas();
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
            Manage Areas
          </h2>
          <p className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted">
            Define spatial nodes that will be used to generate delivery routes.
          </p>
        </div>

        {canWrite && (
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Area</span>
          </Button>
        )}
      </div>

      {/* Areas List */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : areas.length === 0 ? (
        <EmptyState
          title="No areas found"
          description="There are no geographic areas registered in the system yet."
          icon={<MapPin size={40} />}
          action={canWrite ? <Button onClick={() => setIsAddModalOpen(true)}>Create Area</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {areas.map((area) => (
            <Card
              key={area.id}
              className="p-4 border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-xs flex flex-col justify-between hover:border-brand-green-500/10 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-brand-green-50 text-brand-green-500 dark:bg-brand-green-500/10 dark:text-brand-green-100 flex items-center justify-center">
                    <MapPin size={16} />
                  </div>
                  <span className="font-bold text-sm text-light-text-main dark:text-dark-text-main group-hover:text-brand-green-500 dark:group-hover:text-brand-green-100 transition-colors">
                    {area.name}
                  </span>
                </div>
              </div>

              {/* Bottom Metadata & Actions */}
              <div className="flex justify-between items-center mt-5 border-t border-light-border dark:border-dark-border/40 pt-3 text-xs select-none">
                <div className="flex items-center gap-1 text-light-text-muted dark:text-dark-text-muted font-semibold">
                  <CalendarDays size={12} />
                  <span>{formatDateShort(area.createdAt)}</span>
                </div>

                {(canWrite || canDelete) && (
                  <div className="flex items-center gap-1">
                    {/* Rename */}
                    {canWrite && (
                      <button
                        onClick={() => {
                          setEditingArea(area);
                          setEditName(area.name);
                          setIsEditModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-light-text-muted/70 hover:bg-gray-100 dark:hover:bg-dark-border hover:text-light-text-main dark:hover:text-dark-text-main cursor-pointer"
                        title="Rename Area"
                      >
                        <Edit size={12} />
                      </button>
                    )}

                    {/* Delete */}
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteArea(area)}
                        className="p-1.5 rounded-lg text-red-500/70 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 cursor-pointer"
                        title="Delete Area"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Area Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Predefined Area"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="add-area-form" isLoading={isSubmitting}>
              Create Area
            </Button>
          </>
        }
      >
        <form id="add-area-form" onSubmit={handleAddArea} className="flex flex-col gap-4">
          <p className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted mb-1">
            Specify the name of a district, hub, mall, or compound. This node will be available during route creation.
          </p>

          <Input
            label="Area Name"
            placeholder="e.g. Yasmeen, Narges, Rehab"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<MapPin size={18} />}
            required
            disabled={isSubmitting}
          />
        </form>
      </Modal>

      {/* Rename Area Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingArea(null);
          setEditName("");
        }}
        title="Rename Area Node"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingArea(null);
                setEditName("");
              }}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button type="submit" form="rename-area-form" isLoading={isEditing}>
              Save Rename
            </Button>
          </>
        }
      >
        <form id="rename-area-form" onSubmit={handleRenameArea} className="flex flex-col gap-4">
          <Input
            label="Updated Area Name"
            placeholder="e.g. Rehab 1"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            icon={<MapPin size={18} />}
            required
            disabled={isEditing}
          />
        </form>
      </Modal>
    </div>
  );
}
