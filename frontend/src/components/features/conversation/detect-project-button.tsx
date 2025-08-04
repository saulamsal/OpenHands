import React from "react";
import { FileSearch } from "lucide-react";
import { Button } from "#/components/ui/button";
import { useProjectDetection } from "#/hooks/use-project-detection";

export function DetectProjectButton() {
  const {
    detectProjectType,
    isDetecting,
    canDetect,
    currentProjectType,
    confidence,
  } = useProjectDetection();

  // Only show if:
  // 1. Runtime is ready (canDetect)
  // 2. Project type is not detected OR has low confidence
  if (!canDetect || (currentProjectType !== "UNKNOWN" && confidence > 80)) {
    return null;
  }

  return (
    <Button
      onClick={detectProjectType}
      disabled={isDetecting}
      size="sm"
      variant="secondary"
      className="flex items-center gap-2"
    >
      <FileSearch className="w-4 h-4" />
      {isDetecting ? "Detecting..." : "Detect Project Type"}
    </Button>
  );
}
