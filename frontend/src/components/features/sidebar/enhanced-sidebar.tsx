import React from "react";
import { useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "#/context/auth-context";
import { UserActions } from "./user-actions";
import { TeamSwitcher } from "../teams/team-switcher";
import { AllHandsLogoButton } from "#/components/shared/buttons/all-hands-logo-button";
import { DocsButton } from "#/components/shared/buttons/docs-button";
import { NewProjectButton } from "#/components/shared/buttons/new-project-button";
import { SettingsButton } from "#/components/shared/buttons/settings-button";
import { ConversationPanelButton } from "#/components/shared/buttons/conversation-panel-button";
import { SettingsModal } from "#/components/shared/modals/settings/settings-modal";
import { useSettings } from "#/hooks/query/use-settings";
import { ConversationPanel } from "../conversation-panel/conversation-panel";
import { ConversationPanelWrapper } from "../conversation-panel/conversation-panel-wrapper";
import { useLogout } from "#/hooks/mutation/use-logout";
import { useConfig } from "#/hooks/query/use-config";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import { MicroagentManagementButton } from "#/components/shared/buttons/microagent-management-button";
import { useGitUser } from "#/hooks/query/use-git-user";
import { CreateTeamModal } from "../teams/create-team-modal";
import { Team } from "#/api/open-hands.types";

export function EnhancedSidebar() {
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

  const [settingsModalIsOpen, setSettingsModalIsOpen] = React.useState(false);
  const [conversationPanelIsOpen, setConversationPanelIsOpen] =
    React.useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = React.useState(false);

  // TODO: Remove HIDE_LLM_SETTINGS check once released
  const shouldHideLlmSettings = config?.FEATURE_FLAGS.HIDE_LLM_SETTINGS;

  const shouldHideMicroagentManagement =
    config?.FEATURE_FLAGS.HIDE_MICROAGENT_MANAGEMENT;

  // Always in database mode - no need to check

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

  return (
    <>
      <aside className="h-[40px] md:h-auto px-1 flex flex-row md:flex-col gap-1">
        <nav className="flex flex-row md:flex-col items-center justify-between w-full h-auto md:w-auto md:h-full">
          <div className="flex flex-row md:flex-col items-center gap-[26px]">
            <div className="flex items-center justify-center">
              <AllHandsLogoButton />
            </div>
            {/* Team Switcher - always shown when authenticated */}
            {isAuthenticated && (
              <div className="hidden md:block w-full px-2">
                <TeamSwitcher
                  onCreateTeam={() => setShowCreateTeamModal(true)}
                  variant="default"
                />
              </div>
            )}
            <NewProjectButton disabled={settings?.EMAIL_VERIFIED === false} />
            <ConversationPanelButton
              isOpen={conversationPanelIsOpen}
              onClick={() =>
                settings?.EMAIL_VERIFIED === false
                  ? null
                  : setConversationPanelIsOpen((prev) => !prev)
              }
              disabled={settings?.EMAIL_VERIFIED === false}
            />
            {!shouldHideMicroagentManagement && (
              <MicroagentManagementButton
                disabled={settings?.EMAIL_VERIFIED === false}
              />
            )}
          </div>

          <div className="flex flex-row md:flex-col md:items-center gap-[26px] md:mb-4">
            <DocsButton disabled={settings?.EMAIL_VERIFIED === false} />
            <SettingsButton disabled={settings?.EMAIL_VERIFIED === false} />
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
        </nav>

        {conversationPanelIsOpen && (
          <ConversationPanelWrapper isOpen={conversationPanelIsOpen}>
            <ConversationPanel
              onClose={() => setConversationPanelIsOpen(false)}
            />
          </ConversationPanelWrapper>
        )}
      </aside>

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
