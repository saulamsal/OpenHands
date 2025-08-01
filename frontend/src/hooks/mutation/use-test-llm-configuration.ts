import { useMutation } from "@tanstack/react-query";
import {
  llmConfigurationsAPI,
  LLMConfigurationTest,
} from "#/api/llm-configurations";

export const useTestLLMConfiguration = () =>
  useMutation({
    mutationFn: (data: LLMConfigurationTest) => llmConfigurationsAPI.test(data),
  });
