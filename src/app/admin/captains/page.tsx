"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, UserPlus, ArrowRight, ShieldAlert, Mail, User } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

interface Captain {
  id: string;
  name: string;
  email: string;
  todayTrips: number;
  todayRevenue: number;
}

export default function AdminCaptainsPage() {
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch captains list
  async function fetchCaptains() {
    try {
      const res = await fetch("/api/admin/captains");
      if (res.ok) {
        const data = await res.json();
        setCaptains(data.captains);
      }
    } catch (err) {
      console.error("Error fetching captains:", err);
      toast.error("Failed to load captains");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchCaptains();
  }, []);

  // Handle adding a new captain account
  const handleAddCaptain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/captains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create captain account");
      }

      toast.success("Captain account created successfully");
      setIsModalOpen(false);
      
      // Reset form
      setName("");
      setEmail("");
      setPassword("");

      // Refresh list
      fetchCaptains();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Title section */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-black text-light-text-main dark:text-dark-text-main tracking-tight">
            Captain Accounts
          </h2>
          <p className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted">
            Manage registered delivery captains and review their daily outputs.
          </p>
        </div>

        {/* Add Captain button */}
        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
        >
          <UserPlus size={14} />
          <span>Add Captain</span>
        </Button>
      </div>

      {/* Captains Grid / Table */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : captains.length === 0 ? (
        <EmptyState
          title="No captains found"
          description="There are no delivery captains registered in the system yet."
          icon={<Users size={40} />}
          action={
            <Button onClick={() => setIsModalOpen(true)}>Create Captain Account</Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {captains.map((captain) => (
            <Card
              key={captain.id}
              className="p-5 border-light-border dark:border-dark-border flex flex-col justify-between bg-white dark:bg-dark-card shadow-xs hover:border-brand-green-500/10 transition-all group"
            >
              <div className="flex justify-between items-start gap-4">
                {/* Avatar and Name */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-green-50 dark:bg-brand-green-500/10 border border-brand-green-500/15 text-brand-green-500 dark:text-brand-green-100 flex items-center justify-center font-bold">
                    {captain.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-base font-bold text-light-text-main dark:text-dark-text-main group-hover:text-brand-green-500 dark:group-hover:text-brand-green-100 transition-colors">
                      {captain.name}
                    </span>
                    <span className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted leading-none">
                      {captain.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* Today Summary Row */}
              <div className="grid grid-cols-2 gap-4 border-t border-light-border dark:border-dark-border/60 mt-4 pt-3 select-none">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-light-text-muted/80 dark:text-dark-text-muted/80 uppercase tracking-wider leading-none">
                    Today's Trips
                  </span>
                  <span className="text-lg font-black text-light-text-main dark:text-dark-text-main mt-1">
                    {captain.todayTrips}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-brand-gold-600 dark:text-brand-gold-500 uppercase tracking-wider leading-none">
                    Today's Earnings
                  </span>
                  <span className="text-lg font-black text-brand-green-500 dark:text-brand-green-100 mt-1">
                    {formatPrice(captain.todayRevenue)}
                  </span>
                </div>
              </div>

              {/* Details link */}
              <div className="mt-4 flex justify-end">
                <Link
                  href={`/admin/captains/${captain.id}`}
                  className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-green-500 dark:text-brand-green-100 group-hover:underline cursor-pointer"
                >
                  <span>View Details</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Captain Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Captain Account"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="add-captain-form" isLoading={isSubmitting}>
              Create Account
            </Button>
          </>
        }
      >
        <form id="add-captain-form" onSubmit={handleAddCaptain} className="flex flex-col gap-4">
          <p className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted mb-1">
            Create an operations credential for a delivery captain. They will use these details to log in.
          </p>

          <Input
            label="Captain's Name"
            placeholder="e.g. Ahmed Salem"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<User size={18} />}
            required
            disabled={isSubmitting}
          />

          <Input
            label="Operations Email"
            type="email"
            placeholder="e.g. ahmed@mawjood.app"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={18} />}
            required
            disabled={isSubmitting}
          />

          <Input
            label="Initial Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<ShieldAlert size={18} />}
            required
            disabled={isSubmitting}
          />
        </form>
      </Modal>
    </div>
  );
}
