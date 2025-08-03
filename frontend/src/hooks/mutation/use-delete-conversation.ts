import { useMutation, useQueryClient } from "@tanstack/react-query";
import OpenHands from "#/api/open-hands";
import { useAuth } from "#/context/auth-context";

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useAuth();

  return useMutation({
    mutationFn: (variables: { conversationId: string }) =>
      OpenHands.deleteUserConversation(variables.conversationId),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: ["user", "conversations", activeTeam?.id],
      });
      const previousConversations = queryClient.getQueryData([
        "user",
        "conversations",
        activeTeam?.id,
      ]);

      queryClient.setQueryData(
        ["user", "conversations", activeTeam?.id],
        (old: { conversation_id: string }[] | undefined) =>
          old?.filter(
            (conv) => conv.conversation_id !== variables.conversationId,
          ),
      );

      return { previousConversations };
    },
    onError: (err, variables, context) => {
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
