import { useMutation, useQueryClient } from "@tanstack/react-query";
import posthog from "posthog-js";
import OpenHands from "#/api/open-hands";
import { SuggestedTask } from "#/components/features/home/tasks/task.types";
import { Provider } from "#/types/settings";
import { CreateMicroagent } from "#/api/open-hands.types";
import { useAuth } from "#/context/auth-context";

interface CreateConversationVariables {
  query?: string;
  repository?: {
    name: string;
    gitProvider: Provider;
    branch?: string;
  };
  suggestedTask?: SuggestedTask;
  conversationInstructions?: string;
  createMicroagent?: CreateMicroagent;
  mode?: "AGENTIC" | "CHAT";
  agenticQaTest?: boolean;
  framework?: string;
  attachments?: File[];
}

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useAuth();

  return useMutation({
    mutationKey: ["create-conversation"],
    mutationFn: async (variables: CreateConversationVariables) => {
      const {
        query,
        repository,
        suggestedTask,
        conversationInstructions,
        createMicroagent,
        mode,
        agenticQaTest,
        framework,
        attachments,
      } = variables;

      return OpenHands.createConversation(
        repository?.name,
        repository?.gitProvider,
        query,
        suggestedTask,
        repository?.branch,
        conversationInstructions,
        createMicroagent,
        mode,
        agenticQaTest,
        framework,
        attachments,
        activeTeam?.id,
      );
    },
    onSuccess: async (_, { query, repository }) => {
      posthog.capture("initial_query_submitted", {
        entry_point: "task_form",
        query_character_length: query?.length,
        has_repository: !!repository,
      });
      await queryClient.invalidateQueries({
        queryKey: ["user", "conversations", activeTeam?.id],
      });
    },
  });
};
