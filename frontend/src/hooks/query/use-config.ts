import { useQuery } from "@tanstack/react-query";
import OpenHands from "#/api/open-hands";
import { useIsOnTosPage } from "#/hooks/use-is-on-tos-page";
import { useAuth } from "#/context/auth-context";

export const useConfig = () => {
  const isOnTosPage = useIsOnTosPage();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  return useQuery({
    queryKey: ["config"],
    queryFn: async () => OpenHands.getConfig(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes,
    // Always fetch config unless on TOS page
    enabled: !isOnTosPage,
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors (they're handled in queryFn)
      if (error?.response?.status === 401) {
        return false;
      }
      // Default retry behavior for other errors
      return failureCount < 3;
    },
  });
};
