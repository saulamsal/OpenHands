import React, { useState, useEffect, useCallback } from "react";
import { Search, Loader2, AlertCircle, Smartphone } from "lucide-react";
import { IoLogoAppleAppstore, IoLogoGooglePlaystore } from "react-icons/io5";
import { debounce } from "lodash";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { Input } from "#/components/ui/input";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { AppSelectionCard } from "./app-selection-card";
import { useSearchApps, useAppScreenshots } from "#/hooks/query/use-app-store";
import {
  createAppCloneMessage,
  convertScreenshotsToFiles,
  type AppStore,
} from "#/api/app-store";
import type { AppInfo } from "#/api/open-hands.types";
import { cn } from "#/utils/utils";

interface AppStoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateConversation: (
    message: string,
    attachments: File[],
    appInfo: AppInfo,
  ) => void;
}

export function AppStoreModal({
  open,
  onOpenChange,
  onCreateConversation,
}: AppStoreModalProps) {
  const [activeStore, setActiveStore] = useState<AppStore>("apple");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null);
  const [isCloning, setIsCloning] = useState(false);

  // Debounce search term to avoid too many API calls
  const debouncedSetSearchTerm = useCallback(
    debounce((term: string) => {
      setDebouncedSearchTerm(term);
    }, 500),
    [],
  );

  useEffect(() => {
    debouncedSetSearchTerm(searchTerm);
  }, [searchTerm, debouncedSetSearchTerm]);

  // Search apps query
  const {
    data: searchResults,
    isLoading: isSearching,
    error: searchError,
  } = useSearchApps(debouncedSearchTerm, activeStore, 20);

  // Screenshots query for selected app
  const {
    data: screenshotsData,
    isLoading: isLoadingScreenshots,
  } = useAppScreenshots(selectedApp?.id, activeStore);

  const handleStoreChange = (store: string) => {
    setActiveStore(store as AppStore);
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSelectedApp(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCloneApp = async (app: AppInfo) => {
    setSelectedApp(app);
    setIsCloning(true);

    try {
      // Wait for screenshots to load after setting selectedApp (triggers the query)
      // Create a polling mechanism to wait for screenshots
      let screenshots = screenshotsData?.screenshots || [];
      let retries = 0;
      const maxRetries = 20; // 2 seconds max wait time
      
      while (screenshots.length === 0 && retries < maxRetries && isLoadingScreenshots) {
        await new Promise(resolve => setTimeout(resolve, 100));
        screenshots = screenshotsData?.screenshots || [];
        retries++;
      }

      // Convert screenshots to File objects
      const attachments = convertScreenshotsToFiles(screenshots, app.name);

      // Create the conversation message
      const message = createAppCloneMessage(app, activeStore);

      console.log(`[App Store] Cloning app: ${app.name}`);
      console.log(`[App Store] Screenshots attached: ${attachments.length}`);
      console.log(`[App Store] Attachments:`, attachments.map(f => ({ name: f.name, size: f.size, type: f.type })));

      // Create conversation with app data and screenshots
      onCreateConversation(message, attachments, app);

      // Close modal
      onOpenChange(false);

      // Reset state
      setSelectedApp(null);
      setSearchTerm("");
      setDebouncedSearchTerm("");
    } catch (error) {
      console.error("Error cloning app:", error);
      // TODO: Show error toast
    } finally {
      setIsCloning(false);
    }
  };

  const handleModalClose = () => {
    setSelectedApp(null);
    setIsCloning(false);
    onOpenChange(false);
  };

  const showEmptyState = !debouncedSearchTerm && !isSearching;
  const showNoResults =
    debouncedSearchTerm && searchResults?.apps.length === 0 && !isSearching;
  const showResults = searchResults?.apps && searchResults.apps.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Find Apps to Clone
          </DialogTitle>
          <DialogDescription>
            Search for apps from the App Store or Google Play Store to clone
            with React Native and Expo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col">
          {/* Store Tabs */}
          <Tabs
            value={activeStore}
            onValueChange={handleStoreChange}
            className="w-full h-full flex flex-col"
          >
            <div className="flex-shrink-0">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="apple" className="flex items-center gap-2">
                  <IoLogoAppleAppstore className="w-4 h-4" />
                  App Store
                </TabsTrigger>
                <TabsTrigger value="google" className="flex items-center gap-2">
                  <IoLogoGooglePlaystore className="w-4 h-4" />
                  Google Play
                </TabsTrigger>
              </TabsList>

              {/* Search Input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={`Search ${activeStore === "apple" ? "App Store" : "Google Play Store"}...`}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                )}
              </div>

              {/* Error State */}
              {searchError && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to search apps. Please try again.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Content for both tabs */}
            <TabsContent value="apple" className="flex-1 min-h-0">
              <AppStoreContent
                showEmptyState={showEmptyState}
                showNoResults={showNoResults}
                showResults={showResults}
                searchResults={searchResults}
                activeStore={activeStore}
                isCloning={isCloning}
                isLoadingScreenshots={isLoadingScreenshots}
                selectedApp={selectedApp}
                onCloneApp={handleCloneApp}
              />
            </TabsContent>

            <TabsContent value="google" className="flex-1 min-h-0">
              <AppStoreContent
                showEmptyState={showEmptyState}
                showNoResults={showNoResults}
                showResults={showResults}
                searchResults={searchResults}
                activeStore={activeStore}
                isCloning={isCloning}
                isLoadingScreenshots={isLoadingScreenshots}
                selectedApp={selectedApp}
                onCloneApp={handleCloneApp}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AppStoreContentProps {
  showEmptyState: boolean;
  showNoResults: boolean;
  showResults: boolean;
  searchResults: any;
  activeStore: AppStore;
  isCloning: boolean;
  isLoadingScreenshots: boolean;
  selectedApp: AppInfo | null;
  onCloneApp: (app: AppInfo) => void;
}

function AppStoreContent({
  showEmptyState,
  showNoResults,
  showResults,
  searchResults,
  activeStore,
  isCloning,
  isLoadingScreenshots,
  selectedApp,
  onCloneApp,
}: AppStoreContentProps) {
  const storeDisplayName =
    activeStore === "apple" ? "App Store" : "Google Play Store";
  const StoreIcon =
    activeStore === "apple" ? IoLogoAppleAppstore : IoLogoGooglePlaystore;

  return (
    <div className="h-full overflow-auto">
      {/* Empty State */}
      {showEmptyState && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <StoreIcon className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Search {storeDisplayName}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            Enter a search term to find apps you'd like to clone with React
            Native and Expo.
          </p>
        </div>
      )}

      {/* No Results */}
      {showNoResults && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Search className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No apps found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            Try adjusting your search terms or search in a different store.
          </p>
        </div>
      )}

      {/* Search Results */}
      {showResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Found {searchResults.total} apps in {storeDisplayName}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {searchResults.apps.map((app: AppInfo) => (
              <AppSelectionCard
                key={app.id}
                app={app}
                store={activeStore}
                onCloneApp={onCloneApp}
                className={cn(
                  "relative",
                  isCloning &&
                    selectedApp?.id === app.id &&
                    "pointer-events-none opacity-50",
                )}
              />
            ))}
          </div>

          {/* Loading overlay for cloning */}
          {isCloning && selectedApp && (
            <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[60]">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center gap-3 shadow-lg">
                <Loader2 className="w-5 h-5 animate-spin" />
                <div>
                  <p className="font-medium">Cloning {selectedApp.name}...</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isLoadingScreenshots
                      ? "Loading screenshots..."
                      : "Preparing conversation..."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
