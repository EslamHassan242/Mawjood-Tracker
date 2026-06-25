// Central permission helper for all admin API routes

export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];
export type AppRole = AdminRole | "CAPTAIN";

/** Can this role read admin data? */
export function canView(role: string): boolean {
  return ADMIN_ROLES.includes(role as AdminRole);
}

/** Can this role create or edit records? (SUPER_ADMIN + ADMIN) */
export function canWrite(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

/** Can this role delete records? (SUPER_ADMIN only) */
export function canDelete(role: string): boolean {
  return role === "SUPER_ADMIN";
}

/** Can this role manage other admin/moderator users? (SUPER_ADMIN only) */
export function canManageUsers(role: string): boolean {
  return role === "SUPER_ADMIN";
}

/** Is this role any kind of admin (not a captain)? */
export function isAdminRole(role: string): boolean {
  return canView(role);
}
