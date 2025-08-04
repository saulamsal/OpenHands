import React from "react";
import { FaServer, FaExternalLinkAlt } from "react-icons/fa";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { VscCode } from "react-icons/vsc";
import { BarChart3, FileSearch } from "lucide-react";
import { Container } from "#/components/layout/container";
import { I18nKey } from "#/i18n/declaration";
import { RootState } from "#/store";
import { RUNTIME_INACTIVE_STATES } from "#/types/agent-state";
import { ServedAppLabel } from "#/components/layout/served-app-label";
import { TabContent } from "#/components/layout/tab-content";
import { transformVSCodeUrl } from "#/utils/vscode-url-helper";
import { useConversationId } from "#/hooks/use-conversation-id";
import GlobeIcon from "#/icons/globe.svg?react";
import JupyterIcon from "#/icons/jupyter.svg?react";
import OpenHands from "#/api/open-hands";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { ProjectType } from "#/types/project-type";
import { useProjectDetection } from "#/hooks/use-project-detection";
import { Button } from "#/components/ui/button";

export function ConversationTabs() {
  const { curAgentState, runtimeStatus } = useSelector(
    (state: RootState) => state.agent,
  );
  const { conversationId } = useConversationId();
  const { t } = useTranslation();
  const { data: conversation } = useActiveConversation();
  const { detectProjectType, isDetecting, canDetect } = useProjectDetection();
  const hasRunAutoDetection = React.useRef(false);

  // Log runtime status changes
  React.useEffect(() => {
    console.log("[ConversationTabs] Runtime status changed to:", runtimeStatus);
  }, [runtimeStatus]);

  // Auto-detect project type when runtime becomes ready
  React.useEffect(() => {
    console.log(
      "[ConversationTabs] Auto-detection check - Runtime status:",
      runtimeStatus,
      "canDetect:",
      canDetect,
      "hasRunAutoDetection:",
      hasRunAutoDetection.current,
      "projectType:",
      conversation?.project_type,
    );

    if (canDetect && !hasRunAutoDetection.current) {
      // Check if this is an existing conversation without project type
      const isExistingWithoutType =
        !conversation?.project_type ||
        conversation.project_type === ProjectType.UNKNOWN;

      if (isExistingWithoutType) {
        console.log(
          "[ConversationTabs] Existing conversation without project type detected, will run detection",
        );
      }

      console.log(
        "[ConversationTabs] Runtime is ready (STATUS$READY), triggering auto-detection",
      );
      hasRunAutoDetection.current = true;

      // Add a small delay to ensure files are created
      setTimeout(() => {
        console.log("[ConversationTabs] Running project detection after delay");
        detectProjectType();
      }, 3000); // 3 second delay to ensure files are written
    }
  }, [canDetect, detectProjectType, runtimeStatus, conversation?.project_type]);

  const basePath = React.useMemo(
    () => `/conversations/${conversationId}`,
    [conversationId],
  );

  const handleVSCodeClick = React.useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (conversationId) {
        try {
          const data = await OpenHands.getVSCodeUrl(conversationId);
          if (data.vscode_url) {
            const transformedUrl = transformVSCodeUrl(data.vscode_url);
            if (transformedUrl) {
              window.open(transformedUrl, "_blank");
            }
          }
        } catch (err) {
          // Silently handle the error
        }
      }
    },
    [conversationId],
  );

  const vscodeLabel = React.useMemo(
    () => (
      <div className="flex items-center gap-1">{t(I18nKey.VSCODE$TITLE)}</div>
    ),
    [t],
  );

  const browserLabel = React.useMemo(
    () => (
      <div className="flex items-center gap-1">{t(I18nKey.BROWSER$TITLE)}</div>
    ),
    [t],
  );

  const labels = React.useMemo(() => {
    console.log(
      "[ConversationTabs] Building labels - Project type:",
      conversation?.project_type,
      "Detection confidence:",
      conversation?.project_detection_confidence,
    );
    const baseLabels = [
      {
        label: vscodeLabel,
        to: "",
        icon: <VscCode className="w-5 h-5" />,
        rightContent: !RUNTIME_INACTIVE_STATES.includes(curAgentState) ? (
          <FaExternalLinkAlt
            className="w-3 h-3 text-neutral-400 cursor-pointer"
            onClick={handleVSCodeClick}
          />
        ) : null,
      },
      { label: "Jupyter", to: "jupyter", icon: <JupyterIcon /> },
      {
        label: <ServedAppLabel />,
        to: "served",
        icon: <FaServer />,
      },
      {
        label: browserLabel,
        to: "browser",
        icon: <GlobeIcon />,
      },
    ];

    // Add project-specific tabs
    if (conversation?.project_type === ProjectType.EXPO) {
      baseLabels.push({
        label: "Expo Atlas",
        to: "expo-atlas",
        icon: <BarChart3 className="w-5 h-5" />,
        rightContent: null,
      });
    }

    // Future project-specific tabs can be added here
    // if (conversation?.project_type === ProjectType.LARAVEL) {
    //   baseLabels.push({
    //     label: "Laravel Telescope",
    //     to: "telescope",
    //     icon: <TelescopeIcon />,
    //     rightContent: null,
    //   });
    // }

    return baseLabels;
  }, [
    curAgentState,
    vscodeLabel,
    browserLabel,
    handleVSCodeClick,
    t,
    conversation?.project_type,
  ]);

  const showDetectButton =
    canDetect &&
    (!conversation?.project_type ||
      conversation.project_type === ProjectType.UNKNOWN ||
      (conversation.project_detection_confidence || 0) < 50);

  return (
    <Container className="h-full w-full" labels={labels}>
      <div className="h-full w-full relative">
        {showDetectButton && (
          <div className="absolute top-2 right-2 z-10">
            <Button
              onClick={detectProjectType}
              disabled={isDetecting}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileSearch className="w-4 h-4" />
              {isDetecting ? "Detecting..." : "Detect Project Type"}
            </Button>
          </div>
        )}
        <TabContent conversationPath={basePath} />
      </div>
    </Container>
  );
}
