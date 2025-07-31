import React from "react";
import { AuthProvider } from "#/context/auth-context";
import { MemoryRouter } from "react-router";

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

export function AuthWrapperWithRouter({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}