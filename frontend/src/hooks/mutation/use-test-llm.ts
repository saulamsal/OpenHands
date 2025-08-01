import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { openHands } from "#/api/open-hands-axios";
import { Settings } from "#/types/settings";

interface TestLlmResponse {
  status: "success" | "error";
  message: string;
  model?: string;
}

export function useTestLlm() {
  return useMutation<TestLlmResponse, AxiosError<TestLlmResponse>, Settings>({
    mutationFn: async (settings: Settings) => {
      const { data } = await openHands.post<TestLlmResponse>(
        "/api/settings/test-llm",
        settings,
      );
      return data;
    },
  });
}
