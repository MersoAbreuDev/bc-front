import React from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser } from "@/services/auth/api";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
