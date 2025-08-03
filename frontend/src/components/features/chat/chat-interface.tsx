import { useSelector } from "react-redux";
import React from "react";
import posthog from "posthog-js";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { convertImageToBase64 } from "#/utils/convert-image-to-base-64";
import { TrajectoryActions } from "../trajectory/trajectory-actions";
import { createChatMessage } from "#/services/chat-service";
import { InteractiveChatBox } from "./interactive-chat-box";
import { RootState } from "#/store";
import { AgentState } from "#/types/agent-state";
import { isOpenHandsAction } from "#/types/core/guards";
import { generateAgentStateChangeEvent } from "#/services/agent-state-service";
import { useScrollToBottom } from "#/hooks/use-scroll-to-bottom";
import { TypingIndicator } from "./typing-indicator";
import { useWsClient } from "#/context/ws-client-provider";
import { Messages } from "./messages";
import { ChatSuggestions } from "./chat-suggestions";
import { ActionSuggestions } from "./action-suggestions";
import { ScrollProvider } from "#/context/scroll-context";

import { ScrollToBottomButton } from "#/components/shared/buttons/scroll-to-bottom-button";
import { LoadingSpinner } from "#/components/shared/loading-spinner";
import { useGetTrajectory } from "#/hooks/mutation/use-get-trajectory";
import { downloadTrajectory } from "#/utils/download-trajectory";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import { useOptimisticUserMessage } from "#/hooks/use-optimistic-user-message";
import { useWSErrorMessage } from "#/hooks/use-ws-error-message";
import { ErrorMessageBanner } from "./error-message-banner";
import { shouldRenderEvent } from "./event-content-helpers/should-render-event";
import { useUploadFiles } from "#/hooks/mutation/use-upload-files";
import { useConfig } from "#/hooks/query/use-config";
import { validateFiles } from "#/utils/file-validation";
import { InitialDataContext } from "#/wrapper/event-handler";

function getEntryPoint(
  hasRepository: boolean | null,
  hasReplayJson: boolean | null,
): string {
  if (hasRepository) return "github";
  if (hasReplayJson) return "replay";
  return "direct";
}

export function ChatInterface() {
  const { getErrorMessage } = useWSErrorMessage();
  const { send, isLoadingMessages, parsedEvents, webSocketStatus } =
    useWsClient();
  const { setOptimisticUserMessage, getOptimisticUserMessage } =
    useOptimisticUserMessage();
  const { t } = useTranslation();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const {
    scrollDomToBottom,
    onChatBodyScroll,
    hitBottom,
    autoScroll,
    setAutoScroll,
    setHitBottom,
  } = useScrollToBottom(scrollRef);
  const { data: config } = useConfig();
  const initialData = React.useContext(InitialDataContext);
  const [initialMessageSent, setInitialMessageSent] = React.useState(false);

  const { curAgentState } = useSelector((state: RootState) => state.agent);

  const [feedbackPolarity, setFeedbackPolarity] = React.useState<
    "positive" | "negative"
  >("positive");
  const [feedbackModalIsOpen, setFeedbackModalIsOpen] = React.useState(false);
  const [messageToSend, setMessageToSend] = React.useState<string | null>(null);
  const { selectedRepository, replayJson } = useSelector(
    (state: RootState) => state.initialQuery,
  );
  const params = useParams();
  const { mutate: getTrajectory } = useGetTrajectory();
  const { mutateAsync: uploadFiles } = useUploadFiles();

  const optimisticUserMessage = getOptimisticUserMessage();
  const errorMessage = getErrorMessage();

  const events = parsedEvents.filter(shouldRenderEvent);

  // Send initial message when WebSocket connects
  React.useEffect(() => {
    if (
      webSocketStatus === "CONNECTED" &&
      initialData?.initialMessage &&
      !initialMessageSent &&
      !isLoadingMessages
    ) {
      console.log(
        "[ChatInterface] Sending initial message:",
        initialData.initialMessage,
      );

      // Convert File objects to base64 for images and upload files
      const processAttachments = async () => {
        const imageUrls: string[] = [];
        const fileUrls: string[] = [];

        if (initialData.attachments && initialData.attachments.length > 0) {
          const validationResult = validateFiles(
            initialData.attachments,
            config?.SECURITY_ENABLED,
          );
          if (!validationResult.valid) {
            displayErrorToast(validationResult.errors.join(", "));
            return;
          }

          const images = initialData.attachments.filter((file) =>
            file.type.startsWith("image/"),
          );
          const files = initialData.attachments.filter(
            (file) => !file.type.startsWith("image/"),
          );

          // Convert images to base64
          for (const image of images) {
            try {
              const base64 = await convertImageToBase64(image);
              imageUrls.push(base64);
            } catch (error) {
              console.error("Failed to convert image:", error);
              displayErrorToast(
                t(I18nKey.CHAT_INTERFACE$IMAGE_CONVERSION_FAILED),
              );
            }
          }

          // Upload files
          if (files.length > 0) {
            try {
              const uploadedFiles = await uploadFiles(files);
              fileUrls.push(...uploadedFiles);
            } catch (error) {
              console.error("Failed to upload files:", error);
              displayErrorToast(t(I18nKey.CHAT_INTERFACE$FILE_UPLOAD_FAILED));
            }
          }
        }

        const timestamp = new Date().toISOString();
        const chatMessage = createChatMessage(
          initialData.initialMessage,
          imageUrls,
          fileUrls,
          timestamp,
        );

        setOptimisticUserMessage({
          content: initialData.initialMessage,
          image_urls: imageUrls,
          file_urls: fileUrls,
          timestamp,
        });

        send(chatMessage);
        setInitialMessageSent(true);

        // Clear the initial data from navigation state
        window.history.replaceState({}, document.title);
      };

      processAttachments();
    }
  }, [
    webSocketStatus,
    initialData,
    initialMessageSent,
    isLoadingMessages,
    send,
    setOptimisticUserMessage,
    uploadFiles,
    config?.SECURITY_ENABLED,
    t,
  ]);

  // Check if there are any substantive agent actions (not just system messages)
  const hasSubstantiveAgentActions = React.useMemo(
    () =>
      parsedEvents.some(
        (event) =>
          isOpenHandsAction(event) &&
          event.source === "agent" &&
          event.action !== "system",
      ),
    [parsedEvents],
  );

  const handleSendMessage = async (
    content: string,
    originalImages: File[],
    originalFiles: File[],
  ) => {
    // Create mutable copies of the arrays
    const images = [...originalImages];
    const files = [...originalFiles];
    if (events.length === 0) {
      posthog.capture("initial_query_submitted", {
        entry_point: getEntryPoint(
          selectedRepository !== null,
          replayJson !== null,
        ),
        query_character_length: content.length,
        replay_json_size: replayJson?.length,
      });
    } else {
      posthog.capture("user_message_sent", {
        session_message_count: events.length,
        current_message_length: content.length,
      });
    }

    // Validate file sizes before any processing
    const allFiles = [...images, ...files];
    const validation = validateFiles(allFiles);

    if (!validation.isValid) {
      displayErrorToast(`Error: ${validation.errorMessage}`);
      return; // Stop processing if validation fails
    }

    const promises = images.map((image) => convertImageToBase64(image));
    const imageUrls = await Promise.all(promises);

    const timestamp = new Date().toISOString();

    const { skipped_files: skippedFiles, uploaded_files: uploadedFiles } =
      files.length > 0
        ? await uploadFiles({ conversationId: params.conversationId!, files })
        : { skipped_files: [], uploaded_files: [] };

    skippedFiles.forEach((f) => displayErrorToast(f.reason));

    const filePrompt = `${t("CHAT_INTERFACE$AUGMENTED_PROMPT_FILES_TITLE")}: ${uploadedFiles.join("\n\n")}`;
    const prompt =
      uploadedFiles.length > 0 ? `${content}\n\n${filePrompt}` : content;

    send(createChatMessage(prompt, imageUrls, uploadedFiles, timestamp));
    setOptimisticUserMessage(content);
    setMessageToSend(null);
  };

  const handleStop = React.useCallback(() => {
    posthog.capture("stop_button_clicked");
    send(generateAgentStateChangeEvent(AgentState.STOPPED));
  }, [send]);

  const onClickShareFeedbackActionButton = React.useCallback(
    async (polarity: "positive" | "negative") => {
      setFeedbackModalIsOpen(true);
      setFeedbackPolarity(polarity);
    },
    [],
  );

  const onClickExportTrajectoryButton = React.useCallback(() => {
    if (!params.conversationId) {
      displayErrorToast(t(I18nKey.CONVERSATION$DOWNLOAD_ERROR));
      return;
    }

    getTrajectory(params.conversationId, {
      onSuccess: async (data) => {
        await downloadTrajectory(
          params.conversationId ?? t(I18nKey.CONVERSATION$UNKNOWN),
          data.trajectory,
        );
      },
      onError: () => {
        displayErrorToast(t(I18nKey.CONVERSATION$DOWNLOAD_ERROR));
      },
    });
  }, [params.conversationId, getTrajectory, t]);

  const isWaitingForUserInput =
    curAgentState === AgentState.AWAITING_USER_INPUT ||
    curAgentState === AgentState.FINISHED;

  // Create a ScrollProvider with the scroll hook values
  const scrollProviderValue = React.useMemo(
    () => ({
      scrollRef,
      autoScroll,
      setAutoScroll,
      scrollDomToBottom,
      hitBottom,
      setHitBottom,
      onChatBodyScroll,
    }),
    [
      autoScroll,
      scrollDomToBottom,
      hitBottom,
      setAutoScroll,
      setHitBottom,
      onChatBodyScroll,
    ],
  );

  return (
    <ScrollProvider value={scrollProviderValue}>
      <div className="h-full flex flex-col justify-between">
        {!hasSubstantiveAgentActions &&
          !optimisticUserMessage &&
          !events.some(
            (event) => isOpenHandsAction(event) && event.source === "user",
          ) && <ChatSuggestions onSuggestionsClick={setMessageToSend} />}
        {/* Note: We only hide chat suggestions when there's a user message */}

        <div
          ref={scrollRef}
          onScroll={(e) => onChatBodyScroll(e.currentTarget)}
          className="scrollbar scrollbar-thin scrollbar-thumb-gray-400 scrollbar-thumb-rounded-full scrollbar-track-gray-800 hover:scrollbar-thumb-gray-300 flex flex-col grow overflow-y-auto overflow-x-hidden px-4 pt-4 gap-2 fast-smooth-scroll"
        >
          {isLoadingMessages && (
            <div className="flex justify-center">
              <LoadingSpinner size="small" />
            </div>
          )}

          {!isLoadingMessages && (
            <Messages
              messages={events}
              isAwaitingUserConfirmation={
                curAgentState === AgentState.AWAITING_USER_CONFIRMATION
              }
            />
          )}

          {isWaitingForUserInput &&
            hasSubstantiveAgentActions &&
            !optimisticUserMessage && (
              <ActionSuggestions
                onSuggestionsClick={React.useCallback(
                  (value: string) => handleSendMessage(value, [], []),
                  [handleSendMessage],
                )}
              />
            )}
        </div>

        <div className="flex flex-col gap-[6px] px-4 pb-4">
          <div className="flex justify-between relative">
            <TrajectoryActions
              onPositiveFeedback={React.useCallback(
                () => onClickShareFeedbackActionButton("positive"),
                [onClickShareFeedbackActionButton],
              )}
              onNegativeFeedback={React.useCallback(
                () => onClickShareFeedbackActionButton("negative"),
                [onClickShareFeedbackActionButton],
              )}
              onExportTrajectory={onClickExportTrajectoryButton}
            />

            <div className="absolute left-1/2 transform -translate-x-1/2 bottom-0">
              {curAgentState === AgentState.RUNNING && <TypingIndicator />}
            </div>

            {!hitBottom && <ScrollToBottomButton onClick={scrollDomToBottom} />}
          </div>

          {errorMessage && <ErrorMessageBanner message={errorMessage} />}

          <InteractiveChatBox
            onSubmit={handleSendMessage}
            onStop={handleStop}
            isDisabled={
              curAgentState === AgentState.LOADING ||
              curAgentState === AgentState.AWAITING_USER_CONFIRMATION
            }
            mode={curAgentState === AgentState.RUNNING ? "stop" : "submit"}
            value={messageToSend ?? undefined}
            onChange={setMessageToSend}
          />
        </div>

        {/* FeedbackModal removed - not needed for SAAS mode */}
      </div>
    </ScrollProvider>
  );
}
