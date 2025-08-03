import { useMutation, useQueryClient } from "@tanstack/react-query";
import OpenHands from "#/api/open-hands";
import { useAuth } from "#/context/auth-context";

export const useStopConversation = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useAuth();

  return useMutation({
    mutationFn: (variables: { conversationId: string }) =>
      OpenHands.stopConversation(variables.conversationId),
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ["user", "conversations", activeTeam?.id],
      });
      const previousConversations = queryClient.getQueryData([
        "user",
        "conversations",
        activeTeam?.id,
      ]);

      return { previousConversations };
    },
    onError: (_, __, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(
          ["user", "conversations", activeTeam?.id],
          context.previousConversations,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["user", "conversations", activeTeam?.id],
      });
    },
  });
};
