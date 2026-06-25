"use client";

import React, { createContext, useContext } from "react";

interface RoleContextType {
  role: string | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({
  role,
  children,
}: {
  role: string | null;
  children: React.ReactNode;
}) {
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isAdmin = role === "ADMIN";
  const isModerator = role === "MODERATOR";

  // canWrite means create/edit records: SUPER_ADMIN and ADMIN
  const canWrite = isSuperAdmin || isAdmin;

  // canDelete means delete records: SUPER_ADMIN only
  const canDelete = isSuperAdmin;

  return (
    <RoleContext.Provider
      value={{
        role,
        isSuperAdmin,
        isAdmin,
        isModerator,
        canWrite,
        canDelete,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
