import React from "react";
import { Globe, Package, BarChart3, FileCode2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/ui/button";
import { useConversationId } from "#/hooks/use-conversation-id";

interface ExpoAtlasTabProps {
  className?: string;
}

function ExpoAtlasTab({ className }: ExpoAtlasTabProps) {
  const { t } = useTranslation();
  const { conversationId } = useConversationId();
  const [atlasUrl, setAtlasUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const checkAtlasAvailability = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Check if Atlas is running on the default port
      const response = await fetch("http://localhost:8081/_expo/atlas", {
        method: "HEAD",
      });

      if (response.ok) {
        setAtlasUrl("http://localhost:8081/_expo/atlas");
      } else {
        setError(
          "Expo Atlas is not running. Start your project with EXPO_UNSTABLE_ATLAS=true",
        );
      }
    } catch (err) {
      setError(
        "Unable to connect to Expo Atlas. Make sure your Expo project is running.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    checkAtlasAvailability();
  }, [checkAtlasAvailability]);

  return (
    <div className={`flex flex-col h-full ${className || ""}`}>
      <div className="flex-1 bg-background rounded-lg p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Expo Atlas</h2>
              <p className="text-muted-foreground">
                Visualize and understand your bundle output
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">
                Checking Expo Atlas availability...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="space-y-6">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive">{error}</p>
            </div>

            <div className="bg-muted rounded-lg p-6">
              <h3 className="font-semibold mb-3">
                Getting Started with Expo Atlas
              </h3>
              <ol className="space-y-3 text-sm">
                <li className="flex gap-2">
                  <span className="text-muted-foreground">1.</span>
                  <div>
                    <p>Set the environment variable:</p>
                    <code className="block mt-1 bg-background px-2 py-1 rounded text-xs">
                      EXPO_UNSTABLE_ATLAS=true expo start
                    </code>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="text-muted-foreground">2.</span>
                  <p>Launch your app on Android, iOS, or web</p>
                </li>
                <li className="flex gap-2">
                  <span className="text-muted-foreground">3.</span>
                  <p>
                    Open Atlas through the CLI (Shift+M) or visit
                    http://localhost:8081/_expo/atlas
                  </p>
                </li>
              </ol>
            </div>

            <Button onClick={checkAtlasAvailability} variant="outline">
              Check Again
            </Button>
          </div>
        ) : atlasUrl ? (
          <div className="space-y-6">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Expo Atlas is available at{" "}
                <a
                  href={atlasUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-mono"
                >
                  {atlasUrl}
                </a>
              </p>
            </div>

            {/* Atlas Features */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">Bundle Analysis</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Get an overview of your bundle size and composition across
                  platforms
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileCode2 className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">Module Inspector</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  View source and output code for individual modules
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">Dependency Graph</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Visualize the dependency graph for each platform
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">Platform Comparison</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Compare bundle differences between Android, iOS, and web
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button asChild>
                <a href={atlasUrl} target="_blank" rel="noopener noreferrer">
                  Open Expo Atlas
                </a>
              </Button>
              <Button variant="outline" onClick={checkAtlasAvailability}>
                Refresh Status
              </Button>
            </div>
          </div>
        ) : null}

        {/* Info Section */}
        <div className="mt-8 pt-8 border-t">
          <h3 className="font-semibold mb-3">About Expo Atlas</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Expo Atlas helps you visualize and understand your Expo bundle
            output. It provides insights into bundle size, module dependencies,
            and optimization opportunities.
          </p>
          <p className="text-sm text-muted-foreground">
            Available in Expo SDK 51+. Enable it with the EXPO_UNSTABLE_ATLAS
            environment variable.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ExpoAtlasTab;
