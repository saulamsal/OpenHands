import { redirect } from "react-router";
import OpenHands from "#/api/open-hands";

/**
 * Check if user is authenticated by trying to fetch user data
 * @returns true if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    // Try to get current user - cookies will be sent automatically
    await OpenHands.getCurrentUser();
    console.log("[auth.client] User is authenticated");
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 401) {
        console.log("[auth.client] User not authenticated");
        return false;
      }
    }
    // For other errors, assume not authenticated
    console.error("[auth.client] Error checking authentication:", error);
    return false;
  }
}

/**
 * Require authentication for a route. Redirects to login if not authenticated.
 * @param request The request object from the loader
 * @param returnTo Optional URL to return to after login
 * @throws Redirect to login page if not authenticated
 */
export async function requireAuth(
  request: Request,
  returnTo?: string,
): Promise<void> {
  const isAuthed = await isAuthenticated();

  if (!isAuthed) {
    // Get the current URL to redirect back after login
    const url = new URL(request.url);
    const redirectTo = returnTo || url.pathname + url.search;

    // Store the redirect URL in sessionStorage for after login
    if (redirectTo && redirectTo !== "/") {
      sessionStorage.setItem("redirectAfterLogin", redirectTo);
    }

    throw redirect("/login");
  }
}

/**
 * Redirect authenticated users away from auth pages (login/register)
 * @param request The request object from the loader
 * @throws Redirect to home or stored redirect URL if authenticated
 */
export async function redirectIfAuthenticated(
  _request: Request,
): Promise<void> {
  const isAuthed = await isAuthenticated();

  if (isAuthed) {
    // Check if there's a stored redirect URL
    const redirectTo = sessionStorage.getItem("redirectAfterLogin");
    if (redirectTo) {
      sessionStorage.removeItem("redirectAfterLogin");
      throw redirect(redirectTo);
    }

    throw redirect("/");
  }
}

/**
 * Get the redirect URL after login from sessionStorage
 * @returns The URL to redirect to, or "/" if none stored
 */
export function getRedirectAfterLogin(): string {
  const redirectTo = sessionStorage.getItem("redirectAfterLogin");
  sessionStorage.removeItem("redirectAfterLogin");
  return redirectTo || "/";
}

/**
 * Peek at the redirect URL without removing it from sessionStorage
 * @returns The URL to redirect to, or "/" if none stored
 */
export function peekRedirectAfterLogin(): string {
  return sessionStorage.getItem("redirectAfterLogin") || "/";
}
