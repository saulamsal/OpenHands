import React from "react";
import { useHandleWSEvents } from "../hooks/use-handle-ws-events";
import { useHandleRuntimeActive } from "../hooks/use-handle-runtime-active";

interface EventHandlerProps extends React.PropsWithChildren {
  initialData?: {
    initialMessage?: string;
    mode?: "AGENTIC" | "CHAT";
    agenticQaTest?: boolean;
    framework?: string;
    attachments?: File[];
  } | null;
}

// Create a context to pass initial data to child components
export const InitialDataContext =
  React.createContext<EventHandlerProps["initialData"]>(null);

export function EventHandler({ children, initialData }: EventHandlerProps) {
  useHandleWSEvents();
  useHandleRuntimeActive();

  return (
    <InitialDataContext.Provider value={initialData}>
      {children}
    </InitialDataContext.Provider>
  );
}
