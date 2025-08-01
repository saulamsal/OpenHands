import { useQuery } from "@tanstack/react-query";
import { llmConfigurationsAPI } from "#/api/llm-configurations";

export const useLLMConfigurations = (includeInactive = false) =>
  useQuery({
    queryKey: ["llm-configurations", includeInactive],
    queryFn: () => llmConfigurationsAPI.list(includeInactive),
  });
