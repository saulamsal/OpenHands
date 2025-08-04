import React from "react";
import { Clock } from "lucide-react";
import { QueuedMessage } from "#/state/message-queue-slice";
import { cn } from "#/utils/utils";

interface QueuedMessageComponentProps {
  message: QueuedMessage;
}

export function QueuedMessageComponent({
  message,
}: QueuedMessageComponentProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 opacity-60">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-xs font-semibold">You</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-muted-foreground">Queued</span>
          <Clock className="w-3 h-3 text-muted-foreground animate-pulse" />
        </div>
        <div
          className={cn(
            "prose prose-sm max-w-none dark:prose-invert",
            "text-foreground/70",
          )}
        >
          {message.content}
        </div>
        {message.imageUrls.length > 0 && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {message.imageUrls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Queued image ${index + 1}`}
                className="h-16 w-16 object-cover rounded border border-border opacity-70"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
