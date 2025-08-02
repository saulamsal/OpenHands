import React from "react";
import {
  useRouteError,
  isRouteErrorResponse,
  Outlet,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import i18n from "#/i18n";
import { useGitHubAuthUrl } from "#/hooks/use-github-auth-url";
import { useIsAuthed } from "#/hooks/query/use-is-authed";
import { useConfig } from "#/hooks/query/use-config";
import { EnhancedSidebar } from "#/components/features/sidebar/enhanced-sidebar";
import { AuthModal } from "#/components/features/waitlist/auth-modal";
import { EnhancedAuthModal } from "#/components/features/auth/enhanced-auth-modal";
import { useAuth } from "#/context/auth-context";
import { ReauthModal } from "#/components/features/waitlist/reauth-modal";
import { useSettings } from "#/hooks/query/use-settings";
import { useMigrateUserConsent } from "#/hooks/use-migrate-user-consent";
import { useBalance } from "#/hooks/query/use-balance";
import { SetupPaymentModal } from "#/components/features/payment/setup-payment-modal";
import { displaySuccessToast } from "#/utils/custom-toast-handlers";
import { useIsOnTosPage } from "#/hooks/use-is-on-tos-page";
import { useAutoLogin } from "#/hooks/use-auto-login";
import { useAuthCallback } from "#/hooks/use-auth-callback";
import { LOCAL_STORAGE_KEYS } from "#/utils/local-storage";
import { EmailVerificationGuard } from "#/components/features/guards/email-verification-guard";
import { MaintenanceBanner } from "#/components/features/maintenance/maintenance-banner";
import { ThemeProvider } from "#/context/theme-context";

export function ErrorBoundary() {
  const error = useRouteError();
  const { t } = useTranslation();

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>{error.status}</h1>
        <p>{error.statusText}</p>
        <pre>
          {error.data instanceof Object
            ? JSON.stringify(error.data)
            : error.data}
        </pre>
      </div>
    );
  }
  if (error instanceof Error) {
    return (
      <div>
        <h1>{t(I18nKey.ERROR$GENERIC)}</h1>
        <pre>{error.message}</pre>
      </div>
    );
  }

  return (
    <div>
      <h1>{t(I18nKey.ERROR$UNKNOWN)}</h1>
    </div>
  );
}

function MainApp() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isOnTosPage = useIsOnTosPage();
  const { data: settings, refetch: refetchSettings } = useSettings();
  const { error } = useBalance();
  const [searchParams, setSearchParams] = useSearchParams();
  const { migrateUserConsent } = useMigrateUserConsent();
  const { t } = useTranslation();
  const { isAuthenticated: isDbAuthenticated } = useAuth();

  const config = useConfig();
  const {
    data: isAuthed,
    isFetching: isFetchingAuth,
    isError: isAuthError,
  } = useIsAuthed();

  // Always call the hook, but we'll only use the result when not on TOS page
  const gitHubAuthUrl = useGitHubAuthUrl({
    gitHubClientId: config.data?.GITHUB_CLIENT_ID || null,
  });

  // When on TOS page, we don't use the GitHub auth URL
  const effectiveGitHubAuthUrl = isOnTosPage ? null : gitHubAuthUrl;

  const [consentFormIsOpen, setConsentFormIsOpen] = React.useState(false);

  // Auto-login if login method is stored in local storage
  useAutoLogin();

  // Handle authentication callback and set login method after successful authentication
  useAuthCallback();

  React.useEffect(() => {
    // Don't change language when on TOS page
    if (!isOnTosPage && settings?.LANGUAGE) {
      i18n.changeLanguage(settings.LANGUAGE);
    }
  }, [settings?.LANGUAGE, isOnTosPage]);

  React.useEffect(() => {
    // Don't show consent form when on TOS page
    if (!isOnTosPage) {
      const consentFormModalIsOpen =
        settings?.USER_CONSENTS_TO_ANALYTICS === null;

      setConsentFormIsOpen(consentFormModalIsOpen);
    }
  }, [settings, isOnTosPage]);

  React.useEffect(() => {
    // Don't migrate user consent when on TOS page
    if (!isOnTosPage) {
      // Migrate user consent to the server if it was previously stored in localStorage
      migrateUserConsent({
        handleAnalyticsWasPresentInLocalStorage: () => {
          setConsentFormIsOpen(false);
        },
      });
    }
  }, [isOnTosPage]);

  React.useEffect(() => {
    if (settings?.IS_NEW_USER) {
      displaySuccessToast(t(I18nKey.BILLING$YOURE_IN));
    }
  }, [settings?.IS_NEW_USER]);

  // Handle billing success redirect
  React.useEffect(() => {
    const billing = searchParams.get("billing");
    if (billing === "success") {
      // Call API to mark billing as complete
      fetch("/api/billing/complete-setup", {
        method: "POST",
        credentials: "include",
      })
        .then(() => {
          displaySuccessToast("Payment method added successfully!");
          // Refetch settings to update IS_NEW_USER
          refetchSettings();
          // Remove the query parameter
          searchParams.delete("billing");
          setSearchParams(searchParams);
        })
        .catch((error) => {
          console.error("Error completing billing setup:", error);
        });
    } else if (billing === "cancelled") {
      // Handle cancelled payment
      searchParams.delete("billing");
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams, refetchSettings]);

  React.useEffect(() => {
    // Don't do any redirects when on TOS page
    // Don't allow users to use the app if it 402s
    if (!isOnTosPage && error?.status === 402 && pathname !== "/") {
      navigate("/");
    }
  }, [error?.status, pathname, isOnTosPage]);

  // Function to check if login method exists in local storage
  const checkLoginMethodExists = React.useCallback(() => {
    // Only check localStorage if we're in a browser environment
    if (typeof window !== "undefined" && window.localStorage) {
      return localStorage.getItem(LOCAL_STORAGE_KEYS.LOGIN_METHOD) !== null;
    }
    return false;
  }, []);

  // State to track if login method exists
  const [loginMethodExists, setLoginMethodExists] = React.useState(
    checkLoginMethodExists(),
  );

  // Listen for storage events to update loginMethodExists when logout happens
  React.useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === LOCAL_STORAGE_KEYS.LOGIN_METHOD) {
        setLoginMethodExists(checkLoginMethodExists());
      }
    };

    // Also check on window focus, as logout might happen in another tab
    const handleWindowFocus = () => {
      setLoginMethodExists(checkLoginMethodExists());
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [checkLoginMethodExists]);

  // Check login method status when auth status changes
  React.useEffect(() => {
    // When auth status changes (especially on logout), recheck login method
    setLoginMethodExists(checkLoginMethodExists());
  }, [isAuthed, checkLoginMethodExists]);

  // Always in database mode - no auth modals needed
  // Authentication is handled by route guards
  const renderAuthModal = false;
  const renderReAuthModal = false;

  // Don't show EnhancedAuthModal anymore - routes handle auth
  const renderEnhancedAuthModal = false;

  return (
    <div
      data-testid="root-layout"
      className="bg-base p-3 h-screen lg:min-w-[1024px] flex flex-col md:flex-row gap-3"
    >
      <EnhancedSidebar />

      <div
        id="root-outlet"
        className="h-[calc(100%-50px)] md:h-full w-full relative overflow-auto"
      >
        {config.data?.MAINTENANCE && (
          <MaintenanceBanner startTime={config.data.MAINTENANCE.startTime} />
        )}
        <EmailVerificationGuard>
          <Outlet />
        </EmailVerificationGuard>
      </div>

      {renderAuthModal && (
        <AuthModal
          githubAuthUrl={effectiveGitHubAuthUrl}
          providersConfigured={config.data?.PROVIDERS_CONFIGURED}
        />
      )}
      {renderReAuthModal && <ReauthModal />}
      {renderEnhancedAuthModal && (
        <EnhancedAuthModal
          githubAuthUrl={effectiveGitHubAuthUrl}
          providersConfigured={config.data?.PROVIDERS_CONFIGURED}
        />
      )}
      {/* Analytics consent modal removed - not needed for SAAS mode */}

      {config.data?.FEATURE_FLAGS.ENABLE_BILLING && settings?.IS_NEW_USER && (
        <SetupPaymentModal />
      )}
    </div>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
