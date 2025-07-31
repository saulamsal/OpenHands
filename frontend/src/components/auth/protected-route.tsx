import React from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "#/context/auth-context";
import { Skeleton } from "#/components/ui/skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = "/",
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  // If auth is required but user is not authenticated, redirect
  if (requireAuth && !isAuthenticated) {
    // Save the attempted location for redirecting after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If auth is not required but user is authenticated, you might want to redirect
  // For example, redirect from login page to dashboard if already logged in
  if (!requireAuth && isAuthenticated && redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
