import { useDisclosure } from "@heroui/react";
import React from "react";
import { useNavigate, useLocation } from "react-router";
import { useDispatch } from "react-redux";

import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useConversationId } from "#/hooks/use-conversation-id";
import { Controls } from "#/components/features/controls/controls";
import { clearTerminal } from "#/state/command-slice";
import { useEffectOnce } from "#/hooks/use-effect-once";
import { clearJupyter } from "#/state/jupyter-slice";

import { ChatInterface } from "../components/features/chat/chat-interface";
import { WsClientProvider } from "#/context/ws-client-provider";
import { EventHandler } from "../wrapper/event-handler";
import { useConversationConfig } from "#/hooks/query/use-conversation-config";

import Security from "#/components/shared/modals/security/security";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { useSettings } from "#/hooks/query/use-settings";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import { useDocumentTitleFromState } from "#/hooks/use-document-title-from-state";
import OpenHands from "#/api/open-hands";
import { useIsAuthed } from "#/hooks/query/use-is-authed";
import { ConversationSubscriptionsProvider } from "#/context/conversation-subscriptions-provider";
import { useUserProviders } from "#/hooks/use-user-providers";
import { ConversationTabs } from "#/components/features/conversation/conversation-tabs";
import { requireAuth } from "#/utils/auth.client";
import { Route } from "./+types/conversation";
import { SegmentedControl } from "#/components/shared/segmented-control";

const Terminal = React.lazy(
  () => import("#/components/features/terminal/terminal"),
);

const EditorTab = React.lazy(() => import("#/routes/changes-tab"));

export const clientLoader = async ({ request }: Route.ClientLoaderArgs) => {
  // Always require authentication (database is the only mode)
  await requireAuth(request);
  return null;
};

function AppContent() {
  console.log("🔄 AppContent render", new Date().toISOString());
  useConversationConfig();
  const { data: settings } = useSettings();
  const { conversationId } = useConversationId();
  const { data: conversation, isFetched, refetch } = useActiveConversation();
  const { data: isAuthed } = useIsAuthed();
  const { providers } = useUserProviders();
  const location = useLocation();

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Set the document title to the conversation title when available
  useDocumentTitleFromState();

  const [width, setWidth] = React.useState(() => window.innerWidth);
  const [activeTab, setActiveTab] = React.useState("chat");

  React.useEffect(() => {
    if (isFetched && !conversation && isAuthed) {
      displayErrorToast(
        "This conversation does not exist, or you do not have permission to access it.",
      );
      navigate("/");
    } else if (
      conversation?.status === "STOPPED" ||
      conversation?.status === "STARTING"
    ) {
      // start the conversation if the state is stopped or starting on initial load
      OpenHands.startConversation(conversation.conversation_id, providers);
    }
  }, [
    conversation?.conversation_id,
    conversation?.status,
    isFetched,
    isAuthed,
    providers,
    navigate,
  ]);

  React.useEffect(() => {
    dispatch(clearTerminal());
    dispatch(clearJupyter());
  }, [conversationId, dispatch]);

  useEffectOnce(() => {
    dispatch(clearTerminal());
    dispatch(clearJupyter());
  });

  function handleResize() {
    setWidth(window.innerWidth);
  }

  React.useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const {
    isOpen: securityModalIsOpen,
    onOpen: onSecurityModalOpen,
    onOpenChange: onSecurityModalOpenChange,
  } = useDisclosure();

  function renderMain() {
    if (width <= 1024) {
      return (
        <div className="flex flex-col gap-3 overflow-auto w-full h-full">
          <div className="rounded-xl overflow-hidden border border-neutral-600 w-full bg-base-secondary min-h-[494px] flex flex-col">
            <div className="shrink-0">
              <Controls
                setSecurityOpen={onSecurityModalOpen}
                showSecurityLock={!!settings?.SECURITY_ANALYZER}
              />
              <div className="px-4 py-2">
                <SegmentedControl
                  options={[
                    { value: "chat", label: "Chat" },
                    { value: "changes", label: "Changes" },
                  ]}
                  value={activeTab}
                  onValueChange={setActiveTab}
                />
              </div>
            </div>
            <div className="flex-grow overflow-hidden">
              {activeTab === "chat" ? (
                <ChatInterface />
              ) : (
                <React.Suspense fallback={<div className="h-full" />}>
                  <EditorTab />
                </React.Suspense>
              )}
            </div>
          </div>
          <div className="h-full w-full min-h-[494px]">
            <ConversationTabs />
          </div>
          <div className="h-64 w-full rounded-xl overflow-hidden border border-neutral-600 bg-base-secondary">
            <React.Suspense fallback={<div className="h-full" />}>
              <Terminal />
            </React.Suspense>
          </div>
        </div>
      );
    }
    return (
      <div className="h-full w-full">
        <PanelGroup direction="vertical">
          <Panel defaultSize={75} minSize={30}>
            <PanelGroup direction="horizontal" className="h-full">
              <Panel defaultSize={50} minSize={20} className="h-full">
                <div className="rounded-xl overflow-hidden border border-neutral-600 bg-base-secondary flex flex-col h-full">
                  <div className="shrink-0">
                    <Controls
                      setSecurityOpen={onSecurityModalOpen}
                      showSecurityLock={!!settings?.SECURITY_ANALYZER}
                    />
                    <div className="px-4 py-2">
                      <SegmentedControl
                        options={[
                          { value: "chat", label: "Chat" },
                          { value: "changes", label: "Changes" },
                        ]}
                        value={activeTab}
                        onValueChange={setActiveTab}
                      />
                    </div>
                  </div>
                  <div className="flex-grow overflow-hidden">
                    {activeTab === "chat" ? (
                      <ChatInterface />
                    ) : (
                      <React.Suspense fallback={<div className="h-full" />}>
                        <EditorTab />
                      </React.Suspense>
                    )}
                  </div>
                </div>
              </Panel>
              <PanelResizeHandle className="w-3" />
              <Panel defaultSize={50} minSize={20} className="h-full">
                <ConversationTabs />
              </Panel>
            </PanelGroup>
          </Panel>
          <PanelResizeHandle className="h-3" />
          <Panel defaultSize={25} minSize={10} className="h-full">
            <div className="rounded-xl overflow-hidden border border-neutral-600 bg-base-secondary h-full">
              <React.Suspense fallback={<div className="h-full" />}>
                <Terminal />
              </React.Suspense>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    );
  }

  // Extract initial conversation data from navigation state
  const initialData = location.state as {
    initialMessage?: string;
    mode?: "AGENTIC" | "CHAT";
    agenticQaTest?: boolean;
    framework?: string;
    attachments?: File[];
  } | null;

  return (
    <WsClientProvider conversationId={conversationId}>
      <ConversationSubscriptionsProvider>
        <EventHandler initialData={initialData}>
          <div data-testid="app-route" className="flex flex-col h-full w-full">
            <div className="flex h-full overflow-auto w-full">
              {renderMain()}
            </div>

            {settings && (
              <Security
                isOpen={securityModalIsOpen}
                onOpenChange={onSecurityModalOpenChange}
                securityAnalyzer={settings.SECURITY_ANALYZER}
              />
            )}
          </div>
        </EventHandler>
      </ConversationSubscriptionsProvider>
    </WsClientProvider>
  );
}

function App() {
  return <AppContent />;
}

export default App;
