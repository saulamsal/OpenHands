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
import { AppSidebar } from "#/components/features/sidebar/app-sidebar";
import { SidebarProvider, SidebarInset } from "#/components/ui/sidebar";
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
import { TeamSwitcher } from "#/components/features/teams/team-switcher";
import { CreateTeamModal } from "#/components/features/teams/create-team-modal";
import { Team } from "#/api/open-hands.types";
import { useQueryClient } from "@tanstack/react-query";

// Context to control sidebar toggle visibility
export const SidebarToggleVisibilityContext = React.createContext(true);

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
  console.log("🏠 MainApp render", new Date().toISOString());
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isOnTosPage = useIsOnTosPage();
  const { data: settings, refetch: refetchSettings } = useSettings();
  const { error } = useBalance();
  const [searchParams, setSearchParams] = useSearchParams();
  const { migrateUserConsent } = useMigrateUserConsent();
  const { t } = useTranslation();
  const { isAuthenticated: isDbAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateTeamModal, setShowCreateTeamModal] = React.useState(false);

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

  const handleCreateTeam = React.useCallback(
    (team: Team) => {
      // Invalidate teams query to refetch
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setShowCreateTeamModal(false);
    },
    [queryClient],
  );

  const handleShowCreateTeam = React.useCallback(() => {
    setShowCreateTeamModal(true);
  }, []);

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

  // Use the pathname to determine layout behavior
  const currentPathname = pathname;
  // Match specific routes that might need different sidebar behavior
  const isSpecialRoute = /^\/(conversations|projects)\/[\w-]+$/.test(
    currentPathname || "",
  );

  // Custom responsive sidebar logic
  const [sidebarOpen, setSidebarOpen] = React.useState<boolean | undefined>(
    undefined,
  );
  const [isInitialized, setIsInitialized] = React.useState(false);
  const showSidebarToggle = true; // Always show toggle for flexibility

  // Determine responsive sidebar state
  React.useEffect(() => {
    const updateSidebarState = () => {
      const width = window.innerWidth;
      const isDesktop = width >= 1024; // lg breakpoint
      const isTablet = width >= 768 && width < 1024; // md to lg
      const isMobile = width < 768; // below md

      let shouldOpen = false;

      if (isSpecialRoute) {
        // Always collapsed on special routes (detail pages)
        shouldOpen = false;
      } else if (isDesktop) {
        // Desktop: expanded by default
        shouldOpen = true;
      } else if (isTablet || isMobile) {
        // Tablet and mobile: collapsed by default
        shouldOpen = false;
      }

      setSidebarOpen(shouldOpen);
      setIsInitialized(true);
    };

    // Set initial state
    updateSidebarState();

    // Listen for resize events
    const handleResize = () => updateSidebarState();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isSpecialRoute]);

  // Don't render until we've determined the initial state
  if (!isInitialized) {
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-white relative">
      {/* Dynamic Gradient Background */}

      {/* background-image: radial-gradient(ellipse 120% 90% at 50% 55%, #ffffff00 55%, #ff5900 100%);

background-image: radial-gradient(ellipse 120% 90% at 50% 60%, #ffffff00 55%, #ff5900 100%); */}

      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 120% 90% at 50% 55%, #ffffff00 55%, #ff5900 100%)
          `,
          backgroundSize: "100% 100%",
        }}
      />




      {/* App Content */}
      <div className="relative z-10">
        <SidebarToggleVisibilityContext.Provider value={showSidebarToggle}>
          <SidebarProvider
            key={`${currentPathname}-${sidebarOpen}`}
            open={sidebarOpen}
            onOpenChange={setSidebarOpen}
            className=""
          >
            <AppSidebar />
            <SidebarInset>
              <div className="flex flex-1 flex-col gap-4">
                <div
                  id="root-outlet"
                  className="flex-1 w-full relative overflow-auto"
                >

{/* Team Switcher - always shown when authenticated */}
                  {isDbAuthenticated && (
                    <div className="p-4 border-b">
                      <TeamSwitcher
                        onCreateTeam={handleShowCreateTeam}
                        variant="default"
                        collapsed={false}
                      />
                    </div>
                  )}

                  {config.data?.MAINTENANCE && (
                    <MaintenanceBanner
                      startTime={config.data.MAINTENANCE.startTime}
                    />
                  )}
                  <EmailVerificationGuard>
                    <Outlet />
                  </EmailVerificationGuard>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </SidebarToggleVisibilityContext.Provider>
      </div>

      {/* Modals */}
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

      {showCreateTeamModal && (
        <CreateTeamModal
          onClose={() => setShowCreateTeamModal(false)}
          onSuccess={handleCreateTeam}
        />
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
