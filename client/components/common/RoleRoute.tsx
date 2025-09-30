import React from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser } from "@/services/auth/api";

export default function RoleRoute({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/" replace />;
  const userRole = String((user as any).role || "").toUpperCase();
  const allowed = roles.map((r) => String(r).toUpperCase()).includes(userRole);
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}


