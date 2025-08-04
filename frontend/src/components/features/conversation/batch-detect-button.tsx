import React from "react";
import { FileSearch } from "lucide-react";
import { Button } from "#/components/ui/button";
import OpenHands from "#/api/open-hands";
import { toast } from "#/utils/toast";

export function BatchDetectButton() {
  const [isDetecting, setIsDetecting] = React.useState(false);

  const handleBatchDetect = async () => {
    setIsDetecting(true);
    try {
      const result = await OpenHands.detectBatchProjectTypes(10, true);

      if (result.detected > 0) {
        toast.info(
          `Detected project types for ${result.detected} of ${result.processed} conversations`,
        );

        // Refresh the conversations list if needed
        window.location.reload();
      } else if (result.processed === 0) {
        toast.info("No conversations need project detection");
      } else {
        toast.info("No project types could be detected");
      }
    } catch (error) {
      console.error("Batch detection failed:", error);
      toast.error("Failed to detect project types");
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <Button
      onClick={handleBatchDetect}
      disabled={isDetecting}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <FileSearch className="w-4 h-4" />
      {isDetecting ? "Detecting..." : "Detect All Projects"}
    </Button>
  );
}
