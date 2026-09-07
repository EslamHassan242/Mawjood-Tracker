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

export const FEATURE_PERMISSIONS = {
  "Orders.View": ["SUPER_ADMIN", "ADMIN", "MODERATOR", "CAPTAIN"],
  "Orders.Create": ["SUPER_ADMIN", "ADMIN", "MODERATOR"],
  "Orders.Edit": ["SUPER_ADMIN", "ADMIN", "MODERATOR"],
  "Orders.EditArchive": ["SUPER_ADMIN"],
  "Orders.Complete": ["SUPER_ADMIN", "ADMIN", "CAPTAIN"],
  "Orders.Cancel": ["SUPER_ADMIN", "ADMIN"],
  "Orders.ViewHistory": ["SUPER_ADMIN", "ADMIN", "CAPTAIN"],
  "Routes.View": ["SUPER_ADMIN", "ADMIN", "MODERATOR", "CAPTAIN"],
  "Routes.ChangeAvailability": ["SUPER_ADMIN", "ADMIN", "MODERATOR", "CAPTAIN"],
  "Routes.ChangeAreaAvailability": ["SUPER_ADMIN", "ADMIN", "CAPTAIN"],
  "Routes.ConfigureCaptain": ["SUPER_ADMIN", "ADMIN"],
  "Routes.Manage": ["SUPER_ADMIN", "ADMIN"],
} as const;

export type FeaturePermission = keyof typeof FEATURE_PERMISSIONS;
export function hasPermission(role: string, permission: FeaturePermission): boolean {
  return (FEATURE_PERMISSIONS[permission] as readonly string[]).includes(role);
}

export function canChangeIntake(role: string, captainAllowed: boolean, area = false): boolean {
  return hasPermission(role, area ? "Routes.ChangeAreaAvailability" : "Routes.ChangeAvailability") &&
    (role !== "CAPTAIN" || captainAllowed);
}
