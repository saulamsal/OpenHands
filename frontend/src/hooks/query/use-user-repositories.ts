import { useQuery } from "@tanstack/react-query";
import OpenHands from "#/api/open-hands";
import { AxiosError } from "axios";

export const useUserRepositories = () =>
  useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      try {
        return await OpenHands.retrieveUserGitRepositories();
      } catch (error) {
        // Handle Git provider token errors gracefully
        if (error instanceof AxiosError && error.response?.status === 401) {
          const errorMessage = error.response?.data as string;
          const isGitProviderError = 
            typeof errorMessage === "string" && 
            (errorMessage.includes("Git provider token required") || 
             errorMessage.includes("GitHub token required") ||
             errorMessage.includes("GitLab token required") ||
             errorMessage.includes("Bitbucket token required"));
          
          if (isGitProviderError) {
            // Return empty array instead of throwing
            return [];
          }
        }
        // Re-throw other errors
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
