import React from "react";
import { useLocation, Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Settings, BookOpen, Bot, Plus } from "lucide-react";
import { useAuth } from "#/context/auth-context";
import { UserActions } from "./user-actions";
import { TeamSwitcher } from "../teams/team-switcher";
import { AllHandsLogoButton } from "#/components/shared/buttons/all-hands-logo-button";
import { useSettings } from "#/hooks/query/use-settings";
import { useLogout } from "#/hooks/mutation/use-logout";
import { useConfig } from "#/hooks/query/use-config";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import { useGitUser } from "#/hooks/query/use-git-user";
import { CreateTeamModal } from "../teams/create-team-modal";
import { Team } from "#/api/open-hands.types";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
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
  const { state } = useSidebar();

  const [settingsModalIsOpen, setSettingsModalIsOpen] = React.useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = React.useState(false);

  // TODO: Remove HIDE_LLM_SETTINGS check once released
  const shouldHideLlmSettings = config?.FEATURE_FLAGS.HIDE_LLM_SETTINGS;

  const shouldHideMicroagentManagement =
    config?.FEATURE_FLAGS.HIDE_MICROAGENT_MANAGEMENT;

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

  const handleLogout = () => {
    // Call both logout functions
    logout();
    authLogout();
  };

  const handleCreateTeam = (team: Team) => {
    // Invalidate teams query to refetch
    queryClient.invalidateQueries({ queryKey: ["teams"] });
    setShowCreateTeamModal(false);
  };

  // Add some debugging
  console.log("Current pathname:", location.pathname);

  const menuItems = [
    {
      title: "New Project",
      icon: Plus,
      isButton: true,
      disabled: settings?.EMAIL_VERIFIED === false,
      className: "bg-primary text-primary-foreground hover:bg-primary/90",
    },
    {
      title: "Conversations",
      icon: MessageSquare,
      url: "/conversations",
      isActive:
        location.pathname === "/conversations" ||
        location.pathname.startsWith("/conversations/"),
      disabled: settings?.EMAIL_VERIFIED === false,
    },
    ...(shouldHideMicroagentManagement
      ? []
      : [
          {
            title: "Microagents",
            icon: Bot,
            url: "/microagent-management",
            isActive: location.pathname === "/microagent-management",
            disabled: settings?.EMAIL_VERIFIED === false,
          },
        ]),
  ];

  const footerItems = [
    {
      title: "Documentation",
      icon: BookOpen,
      url: "/docs",
      disabled: settings?.EMAIL_VERIFIED === false,
      isActive: location.pathname.startsWith("/docs"),
    },
    {
      title: "Settings",
      icon: Settings,
      onClick: () => setSettingsModalIsOpen(true),
      disabled: settings?.EMAIL_VERIFIED === false,
      isActive: location.pathname.startsWith("/settings"),
    },
  ];

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2">
            <SidebarTrigger />
            {state === "expanded" && (
              <div className="flex items-center justify-center">
                <AllHandsLogoButton />
              </div>
            )}
          </div>

          {/* Team Switcher - always shown when authenticated */}
          {isAuthenticated && state === "expanded" && (
            <div className="px-2">
              <TeamSwitcher
                onCreateTeam={() => setShowCreateTeamModal(true)}
                variant="default"
              />
            </div>
          )}
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
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
                        <Link to={item.url}>
                          <item.icon className="h-4 w-4" />
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
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarGroup>
            <SidebarGroupContent>
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
                      user={
                        user
                          ? { avatar_url: user.email } // Use email as fallback avatar
                          : gitUser.data
                            ? { avatar_url: gitUser.data.avatar_url }
                            : undefined
                      }
                      onLogout={handleLogout}
                      isLoading={gitUser.isFetching}
                    />
                  </div>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarFooter>

        <SidebarRail />
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
