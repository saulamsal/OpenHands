import axios, { AxiosError, AxiosResponse } from "axios";

// Track if we're already redirecting to prevent loops
let isRedirecting = false;

const getBaseURL = () => {
  // If VITE_BACKEND_BASE_URL is not set, return empty string to use relative URLs (proxy)
  if (!import.meta.env.VITE_BACKEND_BASE_URL) {
    return "";
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${import.meta.env.VITE_BACKEND_BASE_URL}`;
  }
  // SSR fallback
  return `http://${import.meta.env.VITE_BACKEND_BASE_URL}`;
};

export const openHands = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true, // Send cookies with requests
});

// Helper function to check if a response contains an email verification error
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const checkForEmailVerificationError = (data: any): boolean => {
  const EMAIL_NOT_VERIFIED = "EmailNotVerifiedError";

  if (typeof data === "string") {
    return data.includes(EMAIL_NOT_VERIFIED);
  }

  if (typeof data === "object" && data !== null) {
    if ("message" in data) {
      const { message } = data;
      if (typeof message === "string") {
        return message.includes(EMAIL_NOT_VERIFIED);
      }
      if (Array.isArray(message)) {
        return message.some(
          (msg) => typeof msg === "string" && msg.includes(EMAIL_NOT_VERIFIED),
        );
      }
    }

    // Search any values in object in case message key is different
    return Object.values(data).some(
      (value) =>
        (typeof value === "string" && value.includes(EMAIL_NOT_VERIFIED)) ||
        (Array.isArray(value) &&
          value.some(
            (v) => typeof v === "string" && v.includes(EMAIL_NOT_VERIFIED),
          )),
    );
  }

  return false;
};

// Helper function to get CSRF token from cookies
const getCSRFToken = (): string | null => {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "csrf_token") {
      return value;
    }
  }
  return null;
};

// Helper function to get active team ID from localStorage
const getActiveTeamId = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("activeTeamId");
};

// Set up request interceptor for CSRF token and team ID
openHands.interceptors.request.use((config) => {
  // Add CSRF token to headers for state-changing requests
  const method = config.method?.toUpperCase();
  if (method && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      // eslint-disable-next-line no-param-reassign
      config.headers["X-CSRF-Token"] = csrfToken;
    }
  }

  // Add team ID to headers for all requests
  const teamId = getActiveTeamId();
  if (teamId) {
    // eslint-disable-next-line no-param-reassign
    config.headers["X-Team-Id"] = teamId;
  }

  return config;
});

// Set up the global response interceptor
openHands.interceptors.response.use(
  (response: AxiosResponse) => {
    // Reset the redirect flag on successful responses
    isRedirecting = false;
    return response;
  },
  (error: AxiosError) => {
    // Check if it's a 401 error (unauthorized)
    if (error.response?.status === 401) {
      // Check if this is a Git provider token error (not a general auth error)
      const errorMessage = error.response?.data as string;
      const isGitProviderError =
        typeof errorMessage === "string" &&
        (errorMessage.includes("Git provider token required") ||
          errorMessage.includes("GitHub token required") ||
          errorMessage.includes("GitLab token required") ||
          errorMessage.includes("Bitbucket token required"));

      // Don't redirect for Git provider token errors
      if (isGitProviderError) {
        return Promise.reject(error);
      }

      // Don't redirect if we're already redirecting (prevents loops)
      if (isRedirecting) {
        return Promise.reject(error);
      }

      // Don't redirect if we're already on login/register/auth-callback pages
      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/register" &&
        window.location.pathname !== "/auth/callback" &&
        !window.location.pathname.startsWith("/auth-callback")
      ) {
        // Save current location for redirect after login
        if (window.location.pathname !== "/") {
          sessionStorage.setItem(
            "redirectAfterLogin",
            window.location.pathname + window.location.search,
          );
        }

        // Set flag to prevent redirect loops
        isRedirecting = true;

        // Small delay to ensure flag is set
        setTimeout(() => {
          window.location.href = "/login";
          // Reset the flag after a longer delay to ensure navigation completes
          setTimeout(() => {
            isRedirecting = false;
          }, 1000);
        }, 100);

        return Promise.reject(error);
      }
    }

    // Check if it's a 403 error with the email verification message
    if (
      error.response?.status === 403 &&
      checkForEmailVerificationError(error.response?.data)
    ) {
      if (window.location.pathname !== "/settings/user") {
        window.location.reload();
      }
    }

    // Continue with the error for other error handlers
    return Promise.reject(error);
  },
);
