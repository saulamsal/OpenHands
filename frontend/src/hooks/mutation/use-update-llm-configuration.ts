import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  llmConfigurationsAPI,
  LLMConfigurationUpdate,
} from "#/api/llm-configurations";

export const useUpdateLLMConfiguration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LLMConfigurationUpdate }) =>
      llmConfigurationsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llm-configurations"] });
    },
  });
};
