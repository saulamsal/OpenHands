import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import React from "react";
import { SiExpo, SiNextdotjs, SiSvelte, SiVuedotjs } from "react-icons/si";
import { VscWand } from "react-icons/vsc";
import { PiSparkleDuotone } from "react-icons/pi";
import { FaGithub } from "react-icons/fa";
import { FaGitlab } from "react-icons/fa6";
import { useCreateConversation } from "#/hooks/mutation/use-create-conversation";
import { useIsCreatingConversation } from "#/hooks/use-is-creating-conversation";
import { useAuth } from "#/context/auth-context";
import { useConfig } from "#/hooks/query/use-config";
import { ProjectInput } from "#/components/shared/input/project-input";
import { InteractionMode } from "#/components/shared/mode-selector";
import { AnimatedEyeballLogo } from "#/components/shared/animation/animated-eyeball-logo";
import { SegmentedControl } from "#/components/shared/segmented-control";
import { RepositorySelectionForm } from "./repo-selection-form";
import { ConnectToProviderMessage } from "./connect-to-provider-message";
import { BaseModal } from "#/components/shared/modals/base-modal/base-modal";
import { useUserProviders } from "#/hooks/use-user-providers";
import { GitRepository } from "#/types/git";
import { ProjectRecommendations } from "./project-recommendations";
import { RepoConnector } from "./repo-connector";
import { TaskSuggestions } from "./tasks/task-suggestions";

const iconClassName = "h-3 w-3";

const frameworks = [
  {
    key: "auto",
    label: "Auto",
    icon: <VscWand className={iconClassName} />,
    description: "Automatically detect framework",
  },
  {
    key: "expo-router",
    label: "Expo Router",
    icon: <SiExpo className={iconClassName} />,
    description: "React Native with Expo",
  },
  {
    key: "nextjs",
    label: "Next.js",
    icon: <SiNextdotjs className={iconClassName} />,
    description: "React framework for production",
    disabled: true,
  },
  {
    key: "vuejs",
    label: "Vue.js",
    icon: <SiVuedotjs className={iconClassName} />,
    description: "Progressive JavaScript framework",
    disabled: true,
  },
  {
    key: "svelte",
    label: "Svelte",
    icon: <SiSvelte className={iconClassName} />,
    description: "Cybernetically enhanced web apps",
    disabled: true,
  },
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
  const { isAuthenticated, isLoading: authLoading, activeTeam } = useAuth();
  const { data: config } = useConfig();
  const { providers } = useUserProviders();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const projectInputRef = React.useRef<HTMLTextAreaElement>(null);

  // Tab state
  const [activeTab, setActiveTab] = React.useState<string>("create-new");
  const [selectedRepo, setSelectedRepo] = React.useState<GitRepository | null>(
    null,
  );
  const [showRepoModal, setShowRepoModal] = React.useState(false);

  const [message, setMessage] = React.useState("");
  const [selectedFramework, setSelectedFramework] =
    React.useState("expo-router");
  const [mode, setMode] = React.useState<InteractionMode>("AGENTIC");
  const [agenticQaTest, setAgenticQaTest] = React.useState(true);
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const currentFramework =
    frameworks.find((f) => f.key === selectedFramework) || frameworks[0];

  const providersAreSet = providers.length > 0;

  // We check for isSuccess because the app might require time to render
  // into the new conversation screen after the conversation is created.
  const isCreatingConversation =
    isPending || isSuccess || isCreatingConversationElsewhere;

  const handleCreateConversation = (initialMessage?: string) => {
    console.log("[HomeHeader] Launch clicked - Auth state:", {
      isAuthenticated,
      authLoading,
      activeTeam: activeTeam?.id,
      message: initialMessage || message,
      mode,
      framework: selectedFramework,
      attachments: attachments.length,
    });

    // Check if user is not authenticated
    if (!isAuthenticated && !authLoading) {
      console.log("[HomeHeader] Not authenticated, redirecting to login");
      navigate("/login");
      return;
    }

    // Wait for teams to load to ensure team_id is sent
    if (!activeTeam && authLoading) {
      console.log("[HomeHeader] Waiting for teams to load...");
      return;
    }

    createConversation(
      {
        query: initialMessage || message,
        mode: mode as "AGENTIC" | "CHAT",
        agenticQaTest,
        framework: selectedFramework,
        attachments,
        repository: selectedRepo
          ? {
              name: selectedRepo.full_name,
              gitProvider: selectedRepo.provider,
              branch: selectedRepo.default_branch,
            }
          : undefined,
      },
      {
        onSuccess: (data) => {
          console.log(
            "[HomeHeader] Conversation created successfully:",
            data.conversation_id,
          );
          // Navigate with state containing initial message and settings
          navigate(`/conversations/${data.conversation_id}`, {
            state: {
              initialMessage: initialMessage || message,
              mode: mode as "AGENTIC" | "CHAT",
              agenticQaTest,
              framework: selectedFramework,
              attachments,
            },
          });
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
    console.log("[HomeHeader] Message sent:", newMessage);
    // Pass the message directly to conversation creation
    handleCreateConversation(newMessage);
  };

  const handleAttach = () => {
    console.log("[HomeHeader] Opening file picker");
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      console.log("[HomeHeader] Files selected:", newFiles);
      setAttachments((prev) => [...prev, ...newFiles]);
    }
    // Reset the input to allow selecting the same file again
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleFrameworkChange = (frameworkKey: string) => {
    const framework = frameworks.find((f) => f.key === frameworkKey);
    if (framework && !framework.disabled) {
      setSelectedFramework(frameworkKey);
    }
  };

  const tabOptions = [
    { value: "create-new", label: "Create New" },
    {
      value: "existing-repositories",
      label: (
        <div className="inline-flex items-center gap-2">
          <span>Existing Repo</span>
          <span className="inline-flex gap-2 bg-fore">
            <FaGithub color="black" /> <FaGitlab color="#E24A30" />
          </span>
        </div>
      ),
    },
    // { value: "explore", label: "Explore" },
  ];

  const handleTabChange = (value: string) => {
    setActiveTab(value);
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

  const handleCloneProject = (cloneMessage: string) => {
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Set the clone message
    setMessage(cloneMessage);

    // Focus the input after a brief delay for smooth scrolling to complete
    setTimeout(() => {
      projectInputRef.current?.focus();
    }, 300);
  };

  return (
    <header className="flex flex-col gap-5">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.txt,.json,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.hpp,.cs,.rb,.go,.rs,.swift,.kt,.php,.html,.css,.scss,.sass,.less,.xml,.yaml,.yml,.toml,.ini,.cfg,.conf,.md,.markdown"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      <div className="flex flex-col items-center justify-between gap-5">
        <AnimatedEyeballLogo width={80} height={80} />

        <h1 className="text-6xl font-bold tracking-tighter relative">
          {t("HOME$LETS_START_BUILDING")}{" "}
          <span
            className="text-7xl text-primary font-bold -top-1 relative "
            style={{ fontFamily: "'Dancing Script Variable', cursive" }}
          >
            {t("magical")} {` `}
            <PiSparkleDuotone className="absolute -top-4 -right-6 text-3xl text-primary" />
          </span>
          <span className="">{t("products.")}</span>
        </h1>
      </div>

      <div className="flex-auto flex-col gap-6 relative mx-auto max-w-4xl">
        {/* Segmented Control for Tab Selection */}
        <div className="flex flex-col w-full relative gap-6">
          <div className="flex items-center justify-center gap-2">
            <SegmentedControl
              options={tabOptions}
              value={activeTab}
              onValueChange={handleTabChange}
              itemClassName="text-sm font-medium tracking-tight h-8 py-0 my-0"
            />
          </div>

          {/* Tab Content */}
          {activeTab === "create-new" && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4 max-w-3xl mx-auto">
                {/* Project Input */}
                <div className="w-full max-w-2xl">
                  <ProjectInput
                    ref={projectInputRef}
                    placeholder="What are we going to build today?"
                    onSend={handleSendMessage}
                    onAttach={handleAttach}
                    disabled={isCreatingConversation}
                    className="w-full"
                    value={message}
                    onChange={setMessage}
                    onSuggestionClick={handleSuggestionClick}
                    mode={mode}
                    agenticQaTest={agenticQaTest}
                    onModeChange={handleModeChange}
                    onAgenticQaTestChange={handleAgenticQaTestChange}
                    attachments={attachments}
                    onRemoveAttachment={(index) => {
                      setAttachments((prev) =>
                        prev.filter((_, i) => i !== index),
                      );
                    }}
                    onFilesSelected={(files) => {
                      setAttachments((prev) => [...prev, ...files]);
                    }}
                  />
                </div>
              </div>

              {/* <QuickSuggestions
                onSuggestionClick={handleSuggestionClick}
                disabled={isCreatingConversation}
              /> */}

              {/* Project Recommendations */}
              <ProjectRecommendations
                selectedFramework={selectedFramework}
                frameworks={frameworks}
                onFrameworkChange={handleFrameworkChange}
                onCreateProject={(recommendation) => {
                  console.log("Creating project:", recommendation);
                  // TODO: Implement project creation logic
                }}
                onCloneProject={handleCloneProject}
              />
            </div>
          )}

          {activeTab === "existing-repositories" && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4 max-w-3xl mx-auto">
                {/* Project Input */}
                <div className="w-full max-w-2xl">
                  <ProjectInput
                    placeholder={
                      selectedRepo
                        ? `Selected: ${selectedRepo.full_name}`
                        : "Click to select a repository..."
                    }
                    onSend={handleSendMessage}
                    onAttach={handleAttach}
                    disabled={isCreatingConversation || !selectedRepo}
                    className="w-full"
                    value={message}
                    onChange={setMessage}
                    onSuggestionClick={handleSuggestionClick}
                    mode={mode}
                    agenticQaTest={agenticQaTest}
                    onModeChange={handleModeChange}
                    onAgenticQaTestChange={handleAgenticQaTestChange}
                    attachments={attachments}
                    onRemoveAttachment={(index) => {
                      setAttachments((prev) =>
                        prev.filter((_, i) => i !== index),
                      );
                    }}
                    onFilesSelected={(files) => {
                      setAttachments((prev) => [...prev, ...files]);
                    }}
                  />
                </div>
              </div>

              {/* <QuickSuggestions
                onSuggestionClick={handleSuggestionClick}
                disabled={isCreatingConversation}
              /> */}

              {/* Repository Connector */}
              <RepoConnector
                onRepoSelection={(repo) => setSelectedRepo(repo)}
              />

              {/* Task Suggestions */}
              {providersAreSet && selectedRepo && (
                <TaskSuggestions filterFor={selectedRepo} />
              )}

              {/* Repository Selection Modal */}
              <BaseModal
                isOpen={showRepoModal}
                onOpenChange={(isOpen) => {
                  setShowRepoModal(isOpen);
                }}
                title="Select Repository"
                subtitle={
                  !providersAreSet
                    ? "Connect to a Git provider to access repositories"
                    : "Choose a repository to work with"
                }
                contentClassName="max-w-[40rem] p-6"
                testID="repository-selection-modal"
              >
                {!providersAreSet ? (
                  <ConnectToProviderMessage />
                ) : (
                  <RepositorySelectionForm
                    onRepoSelection={(repo) => {
                      setSelectedRepo(repo);
                      if (repo) {
                        setShowRepoModal(false);
                      }
                    }}
                  />
                )}
              </BaseModal>
            </div>
          )}

          {activeTab === "explore" && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Coming Soon
                </h3>
                <p className="text-gray-600">
                  Explore community projects and templates
                </p>
              </div>
            </div>
          )}
        </div>
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
