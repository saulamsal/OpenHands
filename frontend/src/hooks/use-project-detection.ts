import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "#/store";
import { useConversationId } from "#/hooks/use-conversation-id";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { useUpdateProjectType } from "#/hooks/mutation/use-update-project-type";
import { ProjectType } from "#/types/project-type";
import OpenHands from "#/api/open-hands";

/**
 * Hook to detect project type using file-based detection
 */
export const useProjectDetection = () => {
  const { conversationId } = useConversationId();
  const { data: conversation } = useActiveConversation();
  const { mutate: updateProjectType } = useUpdateProjectType();
  const [isDetecting, setIsDetecting] = React.useState(false);
  const { curAgentState, runtimeStatus } = useSelector(
    (state: RootState) => state.agent,
  );

  const detectProjectType = React.useCallback(async () => {
    console.log(
      "[detectProjectType] Starting detection - conversationId:",
      conversationId,
      "isDetecting:",
      isDetecting,
      "runtimeStatus:",
      runtimeStatus,
    );

    if (!conversationId || !conversation || isDetecting) {
      console.log("[detectProjectType] Skipping - missing requirements:", {
        conversationId: !!conversationId,
        conversation: !!conversation,
        isDetecting,
      });
      return;
    }

    // Skip if project type is already detected with high confidence
    if (
      conversation.project_type &&
      conversation.project_type !== ProjectType.UNKNOWN &&
      (conversation.project_detection_confidence || 0) > 80
    ) {
      console.log(
        "[detectProjectType] Skipping - already detected:",
        conversation.project_type,
        "confidence:",
        conversation.project_detection_confidence,
      );
      return;
    }

    // Only run detection if runtime is ready
    if (runtimeStatus !== "STATUS$READY") {
      console.log(
        "[detectProjectType] Runtime not ready for project detection - status:",
        runtimeStatus,
      );
      return;
    }

    setIsDetecting(true);
    console.log("[detectProjectType] Making API call to detect project type");

    try {
      // Call the backend API to detect project type from actual files
      const result = await OpenHands.detectProjectType(conversationId);

      console.log("[detectProjectType] API response:", result);

      // Update conversation with detected project type
      if (result.project_type && result.project_type !== "UNKNOWN") {
        console.log(
          "[detectProjectType] Updating project type to:",
          result.project_type,
          "confidence:",
          result.confidence,
        );
        updateProjectType({
          conversationId,
          projectType: result.project_type as ProjectType,
          confidence: result.confidence,
        });
      } else {
        console.log("[detectProjectType] No project type detected");
      }
    } catch (error) {
      console.error(
        "[detectProjectType] Failed to detect project type:",
        error,
      );
    } finally {
      setIsDetecting(false);
    }
  }, [
    conversationId,
    conversation,
    isDetecting,
    updateProjectType,
    runtimeStatus,
  ]);

  return {
    detectProjectType,
    isDetecting,
    currentProjectType: conversation?.project_type || ProjectType.UNKNOWN,
    confidence: conversation?.project_detection_confidence || 0,
    canDetect: runtimeStatus === "STATUS$READY",
  };
};
