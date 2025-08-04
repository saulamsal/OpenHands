import React from "react";
import { useLocation, Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Settings,
  BookOpen,
  Bot,
  Plus,
  Menu,
} from "lucide-react";
import { useAuth } from "#/context/auth-context";
import { UserActions } from "./user-actions";
import { AllHandsLogoButton } from "#/components/shared/buttons/all-hands-logo-button";
import { useSettings } from "#/hooks/query/use-settings";
import { useLogout } from "#/hooks/mutation/use-logout";
import { useConfig } from "#/hooks/query/use-config";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import { useGitUser } from "#/hooks/query/use-git-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "#/components/ui/sidebar";
import { SettingsModal } from "#/components/shared/modals/settings/settings-modal";
import { Button } from "#/components/ui/button";
import { SidebarToggleVisibilityContext } from "#/routes/root-layout";
import { TeamSwitcher } from "#/components/features/teams/team-switcher";
import { CreateTeamModal } from "#/components/features/teams/create-team-modal";
import { Team } from "#/api/open-hands.types";

export function AppSidebar() {
  const location = useLocation();
  const { user, isAuthenticated, logout: authLogout } = useAuth();
  const gitUser = useGitUser();
  const { data: config } = useConfig();
  const queryClient = useQueryClient();
  const {
    data: settings,
    error: settingsError,
    isError: settingsIsError,
    isFetching: isFetchingSettings,
  } = useSettings();
  const { mutate: logout } = useLogout();
  const { state, setOpenMobile, toggleSidebar } = useSidebar();
  const { pathname } = location;

  const [settingsModalIsOpen, setSettingsModalIsOpen] = React.useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = React.useState(false);

  // TODO: Remove HIDE_LLM_SETTINGS check once released
  const shouldHideLlmSettings = config?.FEATURE_FLAGS.HIDE_LLM_SETTINGS;

  const shouldHideMicroagentManagement =
    config?.FEATURE_FLAGS.HIDE_MICROAGENT_MANAGEMENT;

  // Auto-collapse sidebar on specific detail pages
  React.useEffect(() => {
    const isDetailPage = /^\/(conversations|projects)\/[\w-]+$/.test(pathname);
    if (isDetailPage && state === "expanded") {
      setOpenMobile(false);
    }
  }, [pathname, state, setOpenMobile]);

  React.useEffect(() => {
    if (shouldHideLlmSettings) return;

    if (location.pathname === "/settings") {
      setSettingsModalIsOpen(false);
    } else if (
      !isFetchingSettings &&
      settingsIsError &&
      settingsError?.status !== 404
    ) {
      // We don't show toast errors for settings in the global error handler
      // because we have a special case for 404 errors
      displayErrorToast(
        "Something went wrong while fetching settings. Please reload the page.",
      );
    }
  }, [
    settingsError?.status,
    settingsError,
    isFetchingSettings,
    location.pathname,
  ]);

  const handleLogout = React.useCallback(() => {
    // Call both logout functions
    logout();
    authLogout();
  }, [logout, authLogout]);

  const handleShowSettings = React.useCallback(() => {
    setSettingsModalIsOpen(true);
  }, []);

  const handleShowCreateTeam = React.useCallback(() => {
    setShowCreateTeamModal(true);
  }, []);

  const handleCreateTeam = React.useCallback(
    (team: Team) => {
      // Invalidate teams query to refetch
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setShowCreateTeamModal(false);
    },
    [queryClient],
  );

  // Get sidebar toggle visibility from context
  const showSidebarToggle = React.useContext(SidebarToggleVisibilityContext);

  const isConversationsActive = React.useMemo(
    () =>
      location.pathname === "/conversations" ||
      location.pathname.startsWith("/conversations/"),
    [location.pathname],
  );

  const isMicroagentsActive = React.useMemo(
    () => location.pathname === "/microagent-management",
    [location.pathname],
  );

  const isDocsActive = React.useMemo(
    () => location.pathname.startsWith("/docs"),
    [location.pathname],
  );

  const isSettingsActive = React.useMemo(
    () => location.pathname.startsWith("/settings"),
    [location.pathname],
  );

  const menuItems = React.useMemo(
    () => [
      {
        title: "New Project",
        icon: Plus,
        isButton: false,
        disabled: settings?.EMAIL_VERIFIED === false,
        className: "text-primary hover:bg-primary/90",
        onClick: () => {}, // Add empty onClick handler
      },
      {
        title: "Conversations",
        icon: MessageSquare,
        url: "/conversations",
        isActive: isConversationsActive,
        disabled: settings?.EMAIL_VERIFIED === false,
      },
      ...(shouldHideMicroagentManagement
        ? []
        : [
            {
              title: "Microagents",
              icon: Bot,
              url: "/microagent-management",
              isActive: isMicroagentsActive,
              disabled: settings?.EMAIL_VERIFIED === false,
            },
          ]),
    ],
    [
      settings?.EMAIL_VERIFIED,
      shouldHideMicroagentManagement,
      isConversationsActive,
      isMicroagentsActive,
    ],
  );

  const footerItems = React.useMemo(
    () => [
      {
        title: "Documentation",
        icon: BookOpen,
        url: "/docs",
        disabled: settings?.EMAIL_VERIFIED === false,
        isActive: isDocsActive,
      },
      {
        title: "Settings",
        icon: Settings,
        onClick: handleShowSettings,
        disabled: settings?.EMAIL_VERIFIED === false,
        isActive: isSettingsActive,
      },
    ],
    [
      settings?.EMAIL_VERIFIED,
      handleShowSettings,
      isDocsActive,
      isSettingsActive,
    ],
  );

  const userForActions = React.useMemo(() => {
    if (user) {
      return { avatar_url: user.email }; // Use email as fallback avatar
    }
    if (gitUser.data) {
      return { avatar_url: gitUser.data.avatar_url };
    }
    return undefined;
  }, [user, gitUser.data]);

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center px-2">
            {showSidebarToggle && state === "expanded" && <SidebarTrigger />}
            {showSidebarToggle && (
              <div className="flex items-center">
                {state === "collapsed" ? (
                  // When collapsed, show menu icon that expands sidebar
                  <button
                    onClick={toggleSidebar}
                    className="p-2 hover:bg-accent rounded-md transition-colors"
                    title="Expand sidebar"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                ) : (
                  // When expanded, show logo that goes to home
                  <Link to="/">
                    <AllHandsLogoButton />
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Team Switcher - only show when authenticated */}
          {isAuthenticated && (
            <div className="px-2 pb-2">
              <TeamSwitcher
                onCreateTeam={handleShowCreateTeam}
                variant="compact"
                collapsed={state === "collapsed"}
                className="w-full"
              />
            </div>
          )}

          {/* New Project Button */}
          <div className="">
            <Button
              onClick={() => {}}
              className={`w-full gap-2 ${state === "collapsed" ? "justify-center" : "justify-start"}`}
              variant="link"
            >
              <div className="bg-primary rounded-full p-2 w-6 h-6 flex items-center justify-center">
                <Plus className="size-4 text-white" />
              </div>
              {state !== "collapsed" && (
                <span className="text-sm font-bold text-primary">
                  New Project
                </span>
              )}
            </Button>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {/* Main Navigation */}
          <SidebarGroup>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild={!item.isButton}
                    isActive={item.isActive}
                    disabled={item.disabled}
                    tooltip={state === "collapsed" ? item.title : undefined}
                    className={item.className}
                  >
                    {item.isButton ? (
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 p-2 h-8"
                        disabled={item.disabled}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Button>
                    ) : item.url ? (
                      <Link to={item.url} className="cursor-pointer">
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    ) : (
                      <button onClick={item.onClick}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </button>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            {footerItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild={!!item.url}
                  disabled={item.disabled}
                  tooltip={state === "collapsed" ? item.title : undefined}
                >
                  {item.url ? (
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  ) : (
                    <button onClick={item.onClick}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </button>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}

            {/* User Actions */}
            <SidebarMenuItem>
              <div className="px-2 py-1">
                <UserActions
                  user={userForActions}
                  onLogout={handleLogout}
                  isLoading={gitUser.isFetching}
                />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        {showSidebarToggle && <SidebarRail />}
      </Sidebar>

      {settingsModalIsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setSettingsModalIsOpen(false)}
        />
      )}

      {showCreateTeamModal && (
        <CreateTeamModal
          onClose={() => setShowCreateTeamModal(false)}
          onSuccess={handleCreateTeam}
        />
      )}
    </>
  );
}
