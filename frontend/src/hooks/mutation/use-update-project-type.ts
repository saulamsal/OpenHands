import { useMutation, useQueryClient } from "@tanstack/react-query";
import OpenHands from "#/api/open-hands";
import { ProjectType } from "#/types/project-type";

interface UpdateProjectTypeArgs {
  conversationId: string;
  projectType: ProjectType;
  confidence: number;
}

export const useUpdateProjectType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      projectType,
      confidence,
    }: UpdateProjectTypeArgs) => {
      // In a real implementation, this would call an API endpoint
      // For now, we'll just update the local cache
      const response = await OpenHands.updateConversation(conversationId, {
        project_type: projectType,
        project_detection_confidence: confidence,
      });
      return response;
    },
    onSuccess: (_, { conversationId }) => {
      // Invalidate the conversation query to refetch with new project type
      queryClient.invalidateQueries({
        queryKey: ["user", "conversation", conversationId],
      });
    },
  });
};
