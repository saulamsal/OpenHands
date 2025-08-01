import { useMutation, useQueryClient } from "@tanstack/react-query";
import { llmConfigurationsAPI } from "#/api/llm-configurations";

export const useDeleteLLMConfiguration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => llmConfigurationsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llm-configurations"] });
    },
  });
};
