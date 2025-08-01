import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  llmConfigurationsAPI,
  LLMConfigurationCreate,
} from "#/api/llm-configurations";

export const useCreateLLMConfiguration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LLMConfigurationCreate) =>
      llmConfigurationsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llm-configurations"] });
    },
  });
};
