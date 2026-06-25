"use client";

import React, { useState, useEffect } from "react";
import { Shield, UserPlus, Edit, Trash2, Mail, ShieldCheck, ShieldAlert, KeyRound, UserCheck, UserX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRole } from "@/components/navigation/RoleContext";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MODERATOR";
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const { role: currentRole, isSuperAdmin } = useRole();
  const currentUserId = (session?.user as any)?.id;

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add User Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"SUPER_ADMIN" | "ADMIN" | "MODERATOR">("ADMIN");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit User Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"SUPER_ADMIN" | "ADMIN" | "MODERATOR">("ADMIN");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPassword, setEditPassword] = useState(""); // optional password reset
  const [isEditing, setIsEditing] = useState(false);

  // Fetch users
  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      } else {
        toast.error("Failed to load operations staff");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Failed to load operations staff");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
    } else {
      setIsLoading(false);
    }
  }, [isSuperAdmin]);

  // Handle Add User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !role) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      toast.success("Staff account created successfully");
      setIsAddModalOpen(false);
      
      // Reset
      setName("");
      setEmail("");
      setPassword("");
      setRole("ADMIN");

      fetchUsers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit User
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editName || !editEmail) return;

    setIsEditing(true);
    try {
      const payload: any = {
        name: editName,
        email: editEmail,
        role: editRole,
        isActive: editIsActive,
      };

      if (editPassword.trim()) {
        payload.password = editPassword;
      }

      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update account");
      }

      toast.success("Staff account updated successfully");
      setIsEditModalOpen(false);
      setEditingUser(null);
      setEditPassword("");

      fetchUsers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred");
    } finally {
      setIsEditing(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (user: UserAccount) => {
    if (user.id === currentUserId) {
      toast.error("You cannot delete your own account");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the account for ${user.name}? This will remove all their system associations. This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete account");
      }

      toast.success("Staff account permanently deleted");
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred");
    }
  };

  // Permission Gate: Show beautiful access denied screen for non-Super Admins
  if (!isLoading && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center mb-6 border border-red-100 dark:border-red-900/30 shadow-sm animate-bounce">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-black text-light-text-main dark:text-dark-text-main tracking-tight mb-2">
          Access Forbidden
        </h2>
        <p className="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted max-w-md mb-6">
          Staff management is restricted exclusively to Super Administrators. You do not have permissions to view this page.
        </p>
        <Button onClick={() => window.location.replace("/admin")}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title section */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-black text-light-text-main dark:text-dark-text-main tracking-tight">
            Admins & Operations Staff
          </h2>
          <p className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted">
            Manage administrative roles, audit user access, and authorize operations credentials.
          </p>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
        >
          <UserPlus size={14} />
          <span>Add Staff Account</span>
        </Button>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          title="No staff accounts found"
          description="There are no other admin or moderator users registered in the system yet."
          icon={<Shield size={40} />}
          action={<Button onClick={() => setIsAddModalOpen(true)}>Create Staff Account</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            
            return (
              <Card
                key={user.id}
                className={`p-5 border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-xs flex flex-col justify-between hover:border-brand-green-500/10 transition-all group ${
                  !user.isActive && "opacity-60 dark:opacity-50"
                }`}
              >
                {/* Header: Name and Role Badge */}
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm select-none border ${
                      user.role === "SUPER_ADMIN"
                        ? "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/30"
                        : user.role === "ADMIN"
                        ? "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/30"
                        : "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/30"
                    }`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-light-text-main dark:text-dark-text-main group-hover:text-brand-green-500 dark:group-hover:text-brand-green-100 transition-colors">
                          {user.name}
                        </span>
                        {isSelf && (
                          <Badge variant="neutral" className="text-[8px] uppercase tracking-wider py-0 px-1">
                            You
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted leading-none">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Body Details: Role Badge & Active status */}
                <div className="flex items-center justify-between mt-5 border-t border-light-border dark:border-dark-border/40 pt-3 select-none">
                  {/* Role and status badges */}
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      user.role === "SUPER_ADMIN"
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                        : user.role === "ADMIN"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                    }`}>
                      {user.role.replace("_", " ")}
                    </span>
                    <Badge variant={user.isActive ? "success" : "danger"} className="text-[8px] uppercase font-bold py-0.5 px-1.5 leading-none">
                      {user.isActive ? "Active" : "Suspended"}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {/* Edit */}
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setEditName(user.name);
                        setEditEmail(user.email);
                        setEditRole(user.role);
                        setEditIsActive(user.isActive);
                        setIsEditModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-light-text-muted/70 hover:bg-gray-100 dark:hover:bg-dark-border hover:text-light-text-main dark:hover:text-dark-text-main cursor-pointer"
                      title="Edit Staff User"
                    >
                      <Edit size={13} />
                    </button>

                    {/* Delete */}
                    {!isSelf && (
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-1.5 rounded-lg text-red-500/70 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 cursor-pointer"
                        title="Delete Account"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Staff Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Operations Staff"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="add-staff-form" isLoading={isSubmitting}>
              Create Account
            </Button>
          </>
        }
      >
        <form id="add-staff-form" onSubmit={handleAddUser} className="flex flex-col gap-4">
          <p className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted mb-1">
            Register credentials for administrators or moderators. Captain accounts should be created on the Captains tab.
          </p>

          <Input
            label="Full Name"
            placeholder="e.g. Eslam Hassan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isSubmitting}
          />

          <Input
            label="Work Email Address"
            type="email"
            placeholder="e.g. eslam@mawjood.app"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={16} />}
            required
            disabled={isSubmitting}
          />

          <Input
            label="Account Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<KeyRound size={16} />}
            required
            disabled={isSubmitting}
          />

          {/* Role selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-light-text-main/80 dark:text-dark-text-main/80">
              Assigned Access Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full rounded-xl border border-light-border dark:border-dark-border px-4 py-2.5 bg-white dark:bg-dark-card text-light-text-main dark:text-dark-text-main focus:outline-none focus:border-brand-green-500 font-semibold text-sm cursor-pointer"
              disabled={isSubmitting}
            >
              <option value="MODERATOR">Moderator (View-only + Edit, no Create or Delete)</option>
              <option value="ADMIN">Administrator (Create + Edit, no Delete or Staff Control)</option>
              <option value="SUPER_ADMIN">Super Admin (Full operations control + Deletions)</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
          setEditPassword("");
        }}
        title="Manage Staff Account"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingUser(null);
                setEditPassword("");
              }}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button type="submit" form="edit-staff-form" isLoading={isEditing}>
              Save Changes
            </Button>
          </>
        }
      >
        <form id="edit-staff-form" onSubmit={handleEditUser} className="flex flex-col gap-4">
          <Input
            label="Full Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
            disabled={isEditing}
          />

          <Input
            label="Work Email Address"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            icon={<Mail size={16} />}
            required
            disabled={isEditing}
          />

          <Input
            label="Reset Password (Leave blank to keep current)"
            type="password"
            placeholder="Enter new password to reset"
            value={editPassword}
            onChange={(e) => setEditPassword(e.target.value)}
            icon={<KeyRound size={16} />}
            disabled={isEditing}
          />

          {/* Role selector (disabled for self) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-light-text-main/80 dark:text-dark-text-main/80">
              Assigned Access Role
            </label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as any)}
              className="w-full rounded-xl border border-light-border dark:border-dark-border px-4 py-2.5 bg-white dark:bg-dark-card text-light-text-main dark:text-dark-text-main focus:outline-none focus:border-brand-green-500 font-semibold text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isEditing || editingUser?.id === currentUserId}
            >
              <option value="MODERATOR">Moderator (View-only + Edit, no Create or Delete)</option>
              <option value="ADMIN">Administrator (Create + Edit, no Delete or Staff Control)</option>
              <option value="SUPER_ADMIN">Super Admin (Full operations control + Deletions)</option>
            </select>
            {editingUser?.id === currentUserId && (
              <p className="text-[10px] font-semibold text-light-text-muted dark:text-dark-text-muted flex items-center gap-1 mt-0.5">
                <ShieldCheck size={12} className="text-brand-green-500" />
                <span>You cannot change your own administrative role.</span>
              </p>
            )}
          </div>

          {/* Active Status checkbox (disabled for self) */}
          <div className="flex items-center gap-2.5 py-1.5 select-none">
            <input
              type="checkbox"
              id="edit-is-active"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
              className="w-4.5 h-4.5 accent-brand-green-500 rounded-md border-light-border dark:border-dark-border cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isEditing || editingUser?.id === currentUserId}
            />
            <label
              htmlFor="edit-is-active"
              className="text-sm font-bold text-light-text-main dark:text-dark-text-main flex items-center gap-1.5 cursor-pointer"
            >
              {editIsActive ? (
                <>
                  <UserCheck size={16} className="text-brand-green-500" />
                  <span>Authorize account to log in and perform actions</span>
                </>
              ) : (
                <>
                  <UserX size={16} className="text-red-500" />
                  <span>Suspend account from accessing the system</span>
                </>
              )}
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
