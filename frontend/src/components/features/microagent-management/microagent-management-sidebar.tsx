import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Spinner } from "@heroui/react";
import { MicroagentManagementSidebarHeader } from "./microagent-management-sidebar-header";
import { MicroagentManagementSidebarTabs } from "./microagent-management-sidebar-tabs";
import { useUserRepositories } from "#/hooks/query/use-user-repositories";
import { useUserProviders } from "#/hooks/use-user-providers";
import {
  setPersonalRepositories,
  setOrganizationRepositories,
  setRepositories,
} from "#/state/microagent-management-slice";
import { GitRepository } from "#/types/git";
import { cn } from "#/utils/utils";
import { BrandButton } from "#/components/features/settings/brand-button";

interface MicroagentManagementSidebarProps {
  isSmallerScreen?: boolean;
}

export function MicroagentManagementSidebar({
  isSmallerScreen = false,
}: MicroagentManagementSidebarProps) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: repositories, isLoading } = useUserRepositories();
  const { providers } = useUserProviders();

  // Check if any Git providers are configured
  const hasGitProviders = providers.length > 0;

  useEffect(() => {
    if (repositories) {
      const personalRepos: GitRepository[] = [];
      const organizationRepos: GitRepository[] = [];
      const otherRepos: GitRepository[] = [];

      repositories.forEach((repo: GitRepository) => {
        const hasOpenHandsSuffix = repo.full_name.endsWith("/.openhands");

        if (repo.owner_type === "user" && hasOpenHandsSuffix) {
          personalRepos.push(repo);
        } else if (repo.owner_type === "organization" && hasOpenHandsSuffix) {
          organizationRepos.push(repo);
        } else {
          otherRepos.push(repo);
        }
      });

      dispatch(setPersonalRepositories(personalRepos));
      dispatch(setOrganizationRepositories(organizationRepos));
      dispatch(setRepositories(otherRepos));
    }
  }, [repositories, dispatch]);

  return (
    <div
      className={cn(
        "w-[418px] h-full max-h-full overflow-y-auto overflow-x-hidden border-r border-[#525252] bg-[#24272E] rounded-tl-lg rounded-bl-lg py-10 px-6 flex flex-col",
        isSmallerScreen && "w-full border-none",
      )}
    >
      <MicroagentManagementSidebarHeader />
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-4 flex-1">
          <Spinner size="sm" />
          <span className="text-sm text-white">
            {t("HOME$LOADING_REPOSITORIES")}
          </span>
        </div>
      ) : !hasGitProviders ? (
        <div className="flex flex-col items-center justify-center gap-6 flex-1 px-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">
              {t("MICROAGENT$NO_GIT_PROVIDERS_TITLE")}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {t("MICROAGENT$NO_GIT_PROVIDERS_DESCRIPTION")}
            </p>
          </div>
          <BrandButton
            variant="primary"
            onClick={() => navigate("/settings/integrations")}
          >
            {t("MICROAGENT$CONFIGURE_GIT_PROVIDERS")}
          </BrandButton>
        </div>
      ) : (
        <MicroagentManagementSidebarTabs />
      )}
    </div>
  );
}
