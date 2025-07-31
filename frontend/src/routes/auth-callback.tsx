import React from "react";
import { redirect, useNavigate, useSearchParams } from "react-router";
import { LoadingSpinner } from "#/components/shared/loading-spinner";
import { useAuth } from "#/context/auth-context";
import { Route } from "./+types/auth-callback";

export const clientLoader = async ({ request }: Route.ClientLoaderArgs) => {
  // Get the redirect URL from search params
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirect") || "/";

  // If there's no code parameter (OAuth callback), redirect immediately
  // This prevents the page from being accessed directly
  if (!url.searchParams.get("code") && !url.searchParams.get("error")) {
    throw redirect(redirectTo);
  }

  return null;
};

export default function AuthCallbackRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(true);
  const [hasProcessed, setHasProcessed] = React.useState(false);

  React.useEffect(() => {
    // Only process once
    if (hasProcessed) return;

    let timeoutId: NodeJS.Timeout;

    const handleCallback = async () => {
      setHasProcessed(true);
      console.log("[AuthCallback] Starting auth callback");
      const redirect = searchParams.get("redirect") || "/";
      const errorParam = searchParams.get("error");

      console.log("[AuthCallback] Params:", {
        redirect,
        error: errorParam,
        fullUrl: window.location.href,
      });

      if (errorParam) {
        console.log("[AuthCallback] Error param detected:", errorParam);
        setError("GitHub authentication failed. Please try again.");
        setIsProcessing(false);
        setTimeout(() => navigate("/login"), 3000);
        return;
      }

      try {
        console.log("[AuthCallback] Verifying authentication");

        // Set a timeout for the verification process
        timeoutId = setTimeout(() => {
          console.error("[AuthCallback] Verification timeout");
          setError(
            "Authentication verification is taking too long. Please try again.",
          );
          setIsProcessing(false);
          setTimeout(() => navigate("/login"), 3000);
        }, 10000); // 10 second timeout

        // Refresh user data to verify authentication
        // The backend has already set the secure cookie
        await refreshUser();

        clearTimeout(timeoutId);

        console.log(
          "[AuthCallback] Authentication verified, redirecting to:",
          redirect,
        );

        // Navigate to the redirect URL
        navigate(redirect);
      } catch (err) {
        clearTimeout(timeoutId);
        console.error("[AuthCallback] Auth callback error:", err);
        setError("Failed to verify authentication.");
        setIsProcessing(false);
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    handleCallback();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []); // Empty dependency array - only run once

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-sm text-gray-500">
          {isProcessing ? "Completing authentication..." : "Redirecting..."}
        </p>
      </div>
    </div>
  );
}
