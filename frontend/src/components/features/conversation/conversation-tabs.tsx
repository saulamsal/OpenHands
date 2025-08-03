import React from "react";
import { FaServer, FaExternalLinkAlt } from "react-icons/fa";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { VscCode } from "react-icons/vsc";
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

export function ConversationTabs() {
  const { curAgentState } = useSelector((state: RootState) => state.agent);
  const { conversationId } = useConversationId();
  const { t } = useTranslation();

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

  const labels = React.useMemo(
    () => [
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
    ],
    [curAgentState, vscodeLabel, browserLabel, handleVSCodeClick, t],
  );

  return (
    <Container className="h-full w-full" labels={labels}>
      <div className="h-full w-full">
        <TabContent conversationPath={basePath} />
      </div>
    </Container>
  );
}
