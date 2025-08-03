import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import React from "react";
import { useCreateConversation } from "#/hooks/mutation/use-create-conversation";
import { useIsCreatingConversation } from "#/hooks/use-is-creating-conversation";
import { BrandButton } from "../settings/brand-button";
import { useAuth } from "#/context/auth-context";
import { useConfig } from "#/hooks/query/use-config";
import { ProjectInput } from "#/components/shared/input/project-input";
import { InteractionMode } from '#/components/shared/mode-selector';
import { ModeSelectionModal } from '#/components/shared/modals/mode-selection-modal';
import { Button } from '#/components/ui/button';
import { AnimatedEyeballLogo } from "#/components/shared/animation/animated-eyeball-logo";
import { SegmentedControl } from "#/components/shared/segmented-control";
import { RepositorySelectionForm } from "./repo-selection-form";
import { ConnectToProviderMessage } from "./connect-to-provider-message";
import { BaseModal } from "#/components/shared/modals/base-modal/base-modal";
import { useUserProviders } from "#/hooks/use-user-providers";
import { GitRepository } from "#/types/git";
import { QuickSuggestions } from './quick-suggestions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu';
import { SiExpo, SiNextdotjs, SiSvelte, SiVuedotjs } from 'react-icons/si';
import { VscWand } from 'react-icons/vsc';
import { ChevronDown } from 'lucide-react';
import { TextParticle } from "../../../../components/twenty-first/text-particle";



const iconClassName = "h-5 w-5";

const frameworks = [
  { key: 'auto', label: 'Auto', icon: <VscWand className={iconClassName} />, description: 'Automatically detect framework' },
  { key: 'expo', label: 'Expo', icon: <SiExpo className={iconClassName} />, description: 'React Native with Expo' },
  { key: 'nextjs', label: 'Next.js', icon: <SiNextdotjs className={iconClassName} />, description: 'React framework for production', disabled: true },
  { key: 'vuejs', label: 'Vue.js', icon: <SiVuedotjs className={iconClassName} />, description: 'Progressive JavaScript framework', disabled: true },
  { key: 'svelte', label: 'Svelte', icon: <SiSvelte className={iconClassName} />, description: 'Cybernetically enhanced web apps', disabled: true },
];

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
  const [showModeModal, setShowModeModal] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [selectedFramework, setSelectedFramework] = React.useState('expo');
  const [mode, setMode] = React.useState<InteractionMode>('AGENTIC');
  const [agenticQaTest, setAgenticQaTest] = React.useState(true);
  const currentFramework = frameworks.find((f) => f.key === selectedFramework) || frameworks[0];

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

  const handleSendMessage = (newMessage: string) => {
    setMessage(newMessage);
    // For now, just trigger the conversation creation
    // Later we can pass the message to the conversation
    console.log("[HomeHeader] Message sent:", newMessage);
    handleCreateConversation();
  };


  const handleAttach = () => {
    // TODO: Implement file upload functionality
    // This could open a file picker dialog
    console.log(
      "[ProjectInput] Attach clicked - will implement file upload later",
    );
  };

    const handleFrameworkChange = (frameworkKey: string) => {
    const framework = frameworks.find(f => f.key === frameworkKey);
    if (framework && !framework.disabled) {
      setSelectedFramework(frameworkKey);
    }
  };

  const tabOptions = [
    {
      value: 'new-project',
      label: (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 text-sm font-medium tracking-tight">
              {currentFramework.icon}
              <span>{currentFramework.label}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {frameworks.map((framework) => (
              <DropdownMenuItem
                key={framework.key}
                onClick={() => handleFrameworkChange(framework.key)}
                disabled={framework.disabled}
                className={framework.disabled ? 'opacity-60 cursor-not-allowed' : ''}
              >
                {framework.icon}
                <span className="ml-2">{framework.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
    { value: 'existing-repository', label: 'Existing Repo' },
  ];

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'existing-repository') {
      setShowRepoModal(true);
    } else {
      setShowRepoModal(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
  };

  const handleModeChange = (newMode: InteractionMode) => {
    setMode(newMode);
  };

  const handleAgenticQaTestChange = (enabled: boolean) => {
    setAgenticQaTest(enabled);
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
        <div className="flex  flex-col w-auto relative gap-2">


          <div className="flex items-end gap-2 max-w-2xl">
            <Button variant="outline" onClick={() => setShowModeModal(true)}>
              {t(mode === 'AGENTIC' ? 'Agentic' : 'Chat')}
            </Button>
            {/* Project Input - Always visible */}
            <ProjectInput
              placeholder={activeTab === 'new-project' ? "What are we going to build today?" : selectedRepo ? `Selected: ${selectedRepo.full_name}` : "Click to select a repository..."}
              onSend={handleSendMessage}
              onAttach={handleAttach}
              disabled={isCreatingConversation || (activeTab === 'existing-repository' && !selectedRepo)}
              className="w-full"
              value={message}
              onChange={setMessage}
              onSuggestionClick={handleSuggestionClick}
              mode={mode}
              agenticQaTest={agenticQaTest}
            />
          </div>


          <div className="flex items-center gap-2">
            <SegmentedControl
              options={tabOptions}
              value={activeTab}
              onValueChange={handleTabChange}
              itemClassName="text-sm font-medium tracking-tight h-8 py-0 my-0"
            />
          </div>





        </div>

        <QuickSuggestions onSuggestionClick={handleSuggestionClick} disabled={isCreatingConversation} />



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

        <ModeSelectionModal
          isOpen={showModeModal}
          onOpenChange={setShowModeModal}
          mode={mode}
          agenticQaTest={agenticQaTest}
          onModeChange={handleModeChange}
          onAgenticQaTestChange={handleAgenticQaTestChange}
        />
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
