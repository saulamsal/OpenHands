import { useMutation, useQueryClient } from "@tanstack/react-query";
import { llmConfigurationsAPI } from "#/api/llm-configurations";

export const useSetDefaultLLMConfiguration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => llmConfigurationsAPI.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llm-configurations"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
};
