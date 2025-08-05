/**
 * App Store and Google Play Store API client
 */
import { openHands } from "./open-hands-axios";
import type {
  AppSearchResponse,
  AppDetailsResponse,
  AppScreenshotsResponse,
} from "./open-hands.types";

export type AppStore = "apple" | "google";

/**
 * Search for apps in App Store or Google Play Store
 */
export const searchApps = async (
  term: string,
  store: AppStore,
  limit: number = 20,
): Promise<AppSearchResponse> => {
  const { data } = await openHands.get<AppSearchResponse>(
    "/api/app-store/search",
    {
      params: {
        term,
        store,
        limit,
      },
    },
  );
  return data;
};

/**
 * Get detailed information about a specific app
 */
export const getAppDetails = async (
  appId: number,
  store: AppStore,
): Promise<AppDetailsResponse> => {
  const { data } = await openHands.get<AppDetailsResponse>(
    `/api/app-store/app/${appId}`,
    {
      params: {
        store,
      },
    },
  );
  return data;
};

/**
 * Get app screenshots as base64 encoded data for conversation attachments
 */
export const getAppScreenshots = async (
  appId: number,
  store: AppStore,
): Promise<AppScreenshotsResponse> => {
  const { data } = await openHands.get<AppScreenshotsResponse>(
    `/api/app-store/screenshots/${appId}`,
    {
      params: {
        store,
      },
    },
  );
  return data;
};

/**
 * Convert base64 screenshot data to File objects for conversation attachments
 */
export const convertScreenshotsToFiles = (
  screenshots: AppScreenshotsResponse["screenshots"],
  appName: string,
): File[] => {
  console.log(`[AppStore] Converting ${screenshots.length} screenshots for app: ${appName}`);
  
  return screenshots.map((screenshot, index) => {
    console.log(`[AppStore] Processing screenshot ${index + 1}:`, {
      content_type: screenshot.content_type,
      base64_length: screenshot.base64.length,
      has_data_prefix: screenshot.base64.startsWith('data:'),
    });

    // Extract base64 data without the data URL prefix
    const base64Data = screenshot.base64.split(",")[1];

    // Convert base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i += 1) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create file with appropriate name and type
    const fileExtension = screenshot.content_type.includes("png")
      ? "png"
      : "jpg";
    const fileName = `${appName.replace(/[^a-zA-Z0-9]/g, "_")}_screenshot_${index + 1}.${fileExtension}`;

    const file = new File([bytes], fileName, {
      type: screenshot.content_type,
    });

    console.log(`[AppStore] Created file:`, {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    });

    return file;
  });
};

/**
 * Create a formatted message for app cloning conversation
 */
export const createAppCloneMessage = (
  app: AppDetailsResponse["app"],
  store: AppStore,
): string => {
  const storeDisplayName =
    store === "apple" ? "App Store" : "Google Play Store";

  return `I want to clone this ${storeDisplayName} app: "${app.name}"

**App Details:**
- **Name:** ${app.name}
- **Developer:** ${app.developer.name}
- **Category:** ${app.category}
- **Rating:** ${app.ratings.average}/5.0 (${app.ratings.total.toLocaleString()} reviews)
- **Price:** ${app.price.display}
- **Current Version:** ${app.currentVersion}
- **App Store URL:** ${app.url}

**Description:**
${app.description}

**Screenshots:** I've attached ${app.screenshots.length + app.tabletScreenshots.length} screenshots of the app for UI analysis.

Please analyze the attached screenshots and help me:
1. Identify the main UI patterns (tabs, navigation stack, modals, etc.)
2. Extract key features and functionality from the screenshots
3. Plan the app structure and components needed
4. Create a React Native app using Expo that mimics this app's design and functionality
5. Generate appropriate mock data for the app's features

Focus on creating a pixel-perfect clone with proper navigation patterns and realistic dummy content. Use the expo microagent to set up the project properly.`;
};

/**
 * Get app store display name for UI
 */
export const getStoreDisplayName = (store: AppStore): string =>
  store === "apple" ? "App Store" : "Google Play Store";

/**
 * Format app size for display
 */
export const formatAppSize = (sizeInBytes: string): string => {
  const bytes = parseInt(sizeInBytes, 10);
  if (Number.isNaN(bytes)) return "Unknown";

  const sizes = ["B", "KB", "MB", "GB"];
  if (bytes === 0) return "0 B";

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / 1024 ** i).toFixed(1);

  return `${size} ${sizes[i]}`;
};

/**
 * Format number for display (e.g., ratings count)
 */
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};
