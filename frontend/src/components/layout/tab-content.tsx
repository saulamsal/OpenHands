import React, { lazy, Suspense } from "react";
import { useLocation } from "react-router";
import { LoadingSpinner } from "../shared/loading-spinner";

// Lazy load all tab components
const BrowserTab = lazy(() => import("#/routes/browser-tab"));
const JupyterTab = lazy(() => import("#/routes/jupyter-tab"));
const ServedTab = lazy(() => import("#/routes/served-tab"));
const VSCodeTab = lazy(() => import("#/routes/vscode-tab"));
const ExpoAtlasTab = lazy(
  () => import("#/components/features/conversation/expo-atlas-tab"),
);

interface TabContentProps {
  conversationPath: string;
}

export function TabContent({ conversationPath }: TabContentProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  // Determine which tab is active based on the current path
  const isVSCodeActive =
    currentPath === conversationPath ||
    currentPath === `${conversationPath}/vscode`;
  const isBrowserActive = currentPath === `${conversationPath}/browser`;
  const isJupyterActive = currentPath === `${conversationPath}/jupyter`;
  const isServedActive = currentPath === `${conversationPath}/served`;
  const isExpoAtlasActive = currentPath === `${conversationPath}/expo-atlas`;

  return (
    <div className="h-full w-full relative">
      {/* Each tab content is always loaded but only visible when active */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size="large" />
          </div>
        }
      >
        <div
          className={`absolute inset-0 ${isVSCodeActive ? "block" : "hidden"}`}
        >
          <VSCodeTab />
        </div>
        <div
          className={`absolute inset-0 ${isBrowserActive ? "block" : "hidden"}`}
        >
          <BrowserTab />
        </div>
        <div
          className={`absolute inset-0 ${isJupyterActive ? "block" : "hidden"}`}
        >
          <JupyterTab />
        </div>
        <div
          className={`absolute inset-0 ${isServedActive ? "block" : "hidden"}`}
        >
          <ServedTab />
        </div>
        <div
          className={`absolute inset-0 ${isExpoAtlasActive ? "block" : "hidden"}`}
        >
          <ExpoAtlasTab />
        </div>
      </Suspense>
    </div>
  );
}
