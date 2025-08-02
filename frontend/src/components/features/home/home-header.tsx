import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import React from "react";
import { useCreateConversation } from "#/hooks/mutation/use-create-conversation";
import { useIsCreatingConversation } from "#/hooks/use-is-creating-conversation";
import { BrandButton } from "../settings/brand-button";
import { useAuth } from "#/context/auth-context";
import { useConfig } from "#/hooks/query/use-config";
import { ProjectInput } from "#/components/shared/input/project-input";
import { AnimatedEyeballLogo } from "#/components/shared/animation/animated-eyeball-logo";
import { SegmentedControl } from "#/components/shared/segmented-control";
import { RepositorySelectionForm } from "./repo-selection-form";
import { ConnectToProviderMessage } from "./connect-to-provider-message";
import { BaseModal } from "#/components/shared/modals/base-modal/base-modal";
import { useUserProviders } from "#/hooks/use-user-providers";
import { GitRepository } from "#/types/git";

export function HomeHeader() {
  const navigate = useNavigate();
  const {
    mutate: createConversation,
    isPending,
    isSuccess,
  } = useCreateConversation();
  const isCreatingConversationElsewhere = useIsCreatingConversation();
  const { t } = useTranslation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: config } = useConfig();
  const { providers } = useUserProviders();

  // Tab state
  const [activeTab, setActiveTab] = React.useState<string>("new-project");
  const [selectedRepo, setSelectedRepo] = React.useState<GitRepository | null>(null);
  const [showRepoModal, setShowRepoModal] = React.useState(false);

  const providersAreSet = providers.length > 0;

  // We check for isSuccess because the app might require time to render
  // into the new conversation screen after the conversation is created.
  const isCreatingConversation =
    isPending || isSuccess || isCreatingConversationElsewhere;

  const handleCreateConversation = () => {
    console.log("[HomeHeader] Launch clicked - Auth state:", {
      isAuthenticated,
      authLoading,
    });

    // Check if user is not authenticated
    if (!isAuthenticated && !authLoading) {
      console.log("[HomeHeader] Not authenticated, redirecting to login");
      navigate("/login");
      return;
    }

    createConversation(
      {},
      {
        onSuccess: (data) => {
          console.log(
            "[HomeHeader] Conversation created successfully:",
            data.conversation_id,
          );
          navigate(`/conversations/${data.conversation_id}`);
        },
        onError: (error: any) => {
          console.error("[HomeHeader] Failed to create conversation:", error);
          // If we get a 401 error, redirect to login
          if (error?.response?.status === 401) {
            console.log("[HomeHeader] Got 401 error, redirecting to login");
            navigate("/login");
          }
        },
      },
    );
  };

  const handleSendMessage = (message: string) => {
    // For now, just trigger the conversation creation
    // Later we can pass the message to the conversation
    console.log("[HomeHeader] Message sent:", message);
    handleCreateConversation();
  };

  const handleAttach = () => {
    // TODO: Implement file upload functionality
    // This could open a file picker dialog
    console.log(
      "[ProjectInput] Attach clicked - will implement file upload later",
    );
  };

  const tabOptions = [
    { value: 'new-project', label: 'New Universal App' },
    { value: 'existing-repository', label: 'Existing Repository' },
  ];

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'existing-repository') {
      setShowRepoModal(true);
    } else {
      setShowRepoModal(false);
    }
  };

  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-col items-center justify-between gap-5">
        <AnimatedEyeballLogo width={80} height={80} />

        <h1 className="text-6xl font-bold tracking-tighter">
          {t("HOME$LETS_START_BUILDING")}
        </h1>
      </div>

      <div className="flex-auto flex-col gap-6 relative">
        {/* Segmented Control for Tab Selection */}
        <div className="flex gap-2 flex-col w-auto">
          <div className="flex">
            <SegmentedControl
              options={tabOptions}
              value={activeTab}
              onValueChange={handleTabChange}
            // className="w-fit"
            />
          </div>

          {/* Project Input - Always visible */}
          <ProjectInput
            placeholder={activeTab === 'new-project' ? "What are we going to build today?" : selectedRepo ? `Selected: ${selectedRepo.full_name}` : "Click to select a repository..."}
            onSend={handleSendMessage}
            onAttach={handleAttach}
            disabled={isCreatingConversation || (activeTab === 'existing-repository' && !selectedRepo)}
            className="max-w-2xl"
          />

        </div>
        {/* Repository Selection Modal */}
        <BaseModal
          isOpen={showRepoModal}
          onOpenChange={(isOpen) => {
            setShowRepoModal(isOpen);
            if (!isOpen) {
              setActiveTab('new-project');
            }
          }}
          title="Select Repository"
          subtitle={!providersAreSet ? "Connect to a Git provider to access repositories" : "Choose a repository to work with"}
          contentClassName="max-w-[40rem] p-6"
          testID="repository-selection-modal"
        >
          {!providersAreSet ? (
            <ConnectToProviderMessage />
          ) : (
            <RepositorySelectionForm onRepoSelection={(repo) => {
              setSelectedRepo(repo);
              if (repo) {
                setShowRepoModal(false);
              }
            }} />
          )}
        </BaseModal>
      </div>

      <div className="flex items-center justify-between">
        {/* <p className="text-sm max-w-[424px]">
          {t("HOME$OPENHANDS_DESCRIPTION")}
        </p> */}
        {/* <p className="text-sm">
          {t("HOME$NOT_SURE_HOW_TO_START")}{" "}
          <a
            href="https://docs.all-hands.dev/usage/getting-started"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {t("HOME$READ_THIS")}
          </a>
        </p> */}
      </div>
    </header>
  );
}
