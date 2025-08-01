import { useQuery } from "@tanstack/react-query";
import { llmConfigurationsAPI } from "#/api/llm-configurations";

export function useLLMConfigurationsDropdown(provider?: string) {
  return useQuery({
    queryKey: ["llm-configurations", "dropdown", provider],
    queryFn: async () => {
      const configurations = await llmConfigurationsAPI.list(false);
      if (provider) {
        return configurations.filter((config) => config.provider === provider);
      }
      return configurations;
    },
    staleTime: 30000, // 30 seconds
  });
}
