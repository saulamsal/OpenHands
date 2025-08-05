import { useQuery } from "@tanstack/react-query";
import {
  searchApps,
  getAppDetails,
  getAppScreenshots,
  type AppStore,
} from "#/api/app-store";

/**
 * Hook for searching apps in App Store or Google Play Store
 */
export function useSearchApps(
  term: string,
  store: AppStore,
  limit: number = 20,
) {
  return useQuery({
    queryKey: ["app-store", "search", term, store, limit],
    queryFn: () => searchApps(term, store, limit),
    enabled: !!term && term.length >= 2, // Only search if term has at least 2 characters
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
}

/**
 * Hook for getting detailed app information
 */
export function useAppDetails(appId: number | undefined, store: AppStore) {
  return useQuery({
    queryKey: ["app-store", "details", appId, store],
    queryFn: () => getAppDetails(appId!, store),
    enabled: !!appId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook for getting app screenshots for conversation attachments
 */
export function useAppScreenshots(appId: number | undefined, store: AppStore) {
  return useQuery({
    queryKey: ["app-store", "screenshots", appId, store],
    queryFn: async () => {
      console.log(`[AppStore Hook] Fetching screenshots for app ID: ${appId}, store: ${store}`);
      const result = await getAppScreenshots(appId!, store);
      console.log(`[AppStore Hook] Screenshots fetched:`, {
        count: result.screenshots.length,
        app_id: result.app_id,
        store: result.store,
        screenshots_summary: result.screenshots.map((s, i) => ({
          index: i + 1,
          content_type: s.content_type,
          base64_size: s.base64.length,
        }))
      });
      return result;
    },
    enabled: !!appId,
    staleTime: 1000 * 60 * 15, // 15 minutes (screenshots don't change often)
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}
