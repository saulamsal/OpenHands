import { waitFor } from "@testing-library/react";
import { vi, describe, test, expect, beforeEach } from "vitest";
import React from "react";
import { ChatInterface } from "../chat-interface";
import { useWsClient } from "#/context/ws-client-provider";
import { useOptimisticUserMessage } from "#/hooks/use-optimistic-user-message";
import { useWSErrorMessage } from "#/hooks/use-ws-error-message";
import { useConfig } from "#/hooks/query/use-config";
import { useUploadFiles } from "#/hooks/mutation/use-upload-files";
import { useGetTrajectory } from "#/hooks/mutation/use-get-trajectory";
import { useCreateConversationAndSubscribeMultiple } from "#/hooks/use-create-conversation-and-subscribe-multiple";
import { useUserConversation } from "#/hooks/query/use-user-conversation";
import { useConversationId } from "#/hooks/use-conversation-id";
import { useAuth } from "#/context/auth-context";
import { InitialDataContext } from "#/wrapper/event-handler";
import { renderWithProviders } from "../../../../../test-utils";
import { createChatMessage } from "#/services/chat-service";

// Mock dependencies
vi.mock("#/context/ws-client-provider");
vi.mock("#/hooks/use-optimistic-user-message");
vi.mock("#/hooks/use-ws-error-message");
vi.mock("#/hooks/query/use-config");
vi.mock("#/hooks/mutation/use-upload-files");
vi.mock("#/hooks/mutation/use-get-trajectory");
vi.mock("#/services/chat-service");
vi.mock("#/utils/convert-image-to-base-64", () => ({
  convertImageToBase64: vi.fn().mockResolvedValue("data:image/png;base64,fake"),
}));
vi.mock("#/hooks/use-create-conversation-and-subscribe-multiple");
vi.mock("#/hooks/query/use-user-conversation");
vi.mock("#/hooks/use-conversation-id");
vi.mock("#/context/auth-context");
vi.mock("#/utils/file-validation", () => ({
  validateFiles: vi.fn().mockReturnValue({ valid: true, errors: [] }),
}));

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  useParams: vi.fn(() => ({ conversationId: "test-conversation-id" })),
}));

// Mock i18n key
vi.mock("#/i18n/declaration", () => ({
  I18nKey: {
    CHAT_INTERFACE$IMAGE_CONVERSION_FAILED:
      "CHAT_INTERFACE$IMAGE_CONVERSION_FAILED",
    CHAT_INTERFACE$FILE_UPLOAD_FAILED: "CHAT_INTERFACE$FILE_UPLOAD_FAILED",
  },
}));

describe("ChatInterface - Initial Message", () => {
  const mockSend = vi.fn();
  const mockSetOptimisticUserMessage = vi.fn();
  const mockUploadFiles = vi.fn();
  const mockGetTrajectory = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    (useWsClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      send: mockSend,
      isLoadingMessages: false,
      parsedEvents: [],
      webSocketStatus: "DISCONNECTED",
    });

    (
      useOptimisticUserMessage as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      setOptimisticUserMessage: mockSetOptimisticUserMessage,
      getOptimisticUserMessage: vi.fn(() => null),
    });

    (useWSErrorMessage as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      getErrorMessage: vi.fn(() => null),
      setErrorMessage: vi.fn(),
      removeErrorMessage: vi.fn(),
    });

    (useConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { SECURITY_ENABLED: false },
    });

    (useUploadFiles as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: mockUploadFiles,
      isLoading: false,
    });

    (useGetTrajectory as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockGetTrajectory,
    });

    (
      createChatMessage as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation((message, imageUrls, fileUrls, timestamp) => ({
      action: "message",
      args: {
        content: message,
        image_urls: imageUrls,
        file_urls: fileUrls,
        timestamp,
      },
    }));

    // Mock additional hooks
    (
      useCreateConversationAndSubscribeMultiple as unknown as ReturnType<
        typeof vi.fn
      >
    ).mockReturnValue({
      createConversationAndSubscribe: vi.fn(),
      isPending: false,
    });

    (
      useUserConversation as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      data: null,
    });

    (useConversationId as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      conversationId: "test-conversation-id",
    });

    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
  });

  const renderWithInitialData = (initialData: any) =>
    renderWithProviders(
      <InitialDataContext.Provider value={initialData}>
        <ChatInterface />
      </InitialDataContext.Provider>,
    );

  test("should send initial message when WebSocket connects", async () => {
    const initialData = {
      initialMessage: "Build a React app",
      mode: "AGENTIC" as const,
      agenticQaTest: true,
      framework: "expo",
      attachments: [],
    };

    const { rerender } = renderWithInitialData(initialData);

    // Simulate WebSocket connection
    (useWsClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      send: mockSend,
      isLoadingMessages: false,
      parsedEvents: [],
      webSocketStatus: "CONNECTED",
    });

    rerender(
      <InitialDataContext.Provider value={initialData}>
        <ChatInterface />
      </InitialDataContext.Provider>,
    );

    await waitFor(() => {
      expect(mockSetOptimisticUserMessage).toHaveBeenCalledWith({
        content: "Build a React app",
        image_urls: [],
        file_urls: [],
        timestamp: expect.any(String),
      });

      expect(mockSend).toHaveBeenCalledWith({
        action: "message",
        args: {
          content: "Build a React app",
          image_urls: [],
          file_urls: [],
          timestamp: expect.any(String),
        },
      });
    });
  });

  test("should not send initial message when already sent", async () => {
    const initialData = {
      initialMessage: "Test message",
      mode: "AGENTIC" as const,
      agenticQaTest: false,
      framework: "auto",
      attachments: [],
    };

    // Start with connected WebSocket
    (useWsClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      send: mockSend,
      isLoadingMessages: false,
      parsedEvents: [],
      webSocketStatus: "CONNECTED",
    });

    const { rerender } = renderWithInitialData(initialData);

    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    // Clear mocks to check if it sends again
    mockSend.mockClear();

    // Re-render (simulating component update)
    rerender(
      <InitialDataContext.Provider value={initialData}>
        <ChatInterface />
      </InitialDataContext.Provider>,
    );

    // Should not send again
    expect(mockSend).not.toHaveBeenCalled();
  });

  test("should handle attachments in initial message", async () => {
    const mockFile = new File(["content"], "test.txt", { type: "text/plain" });
    const mockImageFile = new File(["image"], "test.png", {
      type: "image/png",
    });

    const initialData = {
      initialMessage: "Process these files",
      mode: "AGENTIC" as const,
      agenticQaTest: true,
      framework: "expo",
      attachments: [mockFile, mockImageFile],
    };

    // Mock file upload
    mockUploadFiles.mockResolvedValue(["uploaded-file-url"]);

    const { rerender } = renderWithInitialData(initialData);

    // Simulate WebSocket connection
    (useWsClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      send: mockSend,
      isLoadingMessages: false,
      parsedEvents: [],
      webSocketStatus: "CONNECTED",
    });

    rerender(
      <InitialDataContext.Provider value={initialData}>
        <ChatInterface />
      </InitialDataContext.Provider>,
    );

    await waitFor(() => {
      expect(mockUploadFiles).toHaveBeenCalledWith([mockFile]);

      expect(mockSetOptimisticUserMessage).toHaveBeenCalledWith({
        content: "Process these files",
        image_urls: ["data:image/png;base64,fake"],
        file_urls: ["uploaded-file-url"],
        timestamp: expect.any(String),
      });

      expect(mockSend).toHaveBeenCalledWith({
        action: "message",
        args: {
          content: "Process these files",
          image_urls: ["data:image/png;base64,fake"],
          file_urls: ["uploaded-file-url"],
          timestamp: expect.any(String),
        },
      });
    });
  });

  test("should not send when WebSocket is not connected", async () => {
    const initialData = {
      initialMessage: "Test message",
      mode: "CHAT" as const,
      agenticQaTest: false,
      framework: "auto",
      attachments: [],
    };

    // Start with disconnected WebSocket
    (useWsClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      send: mockSend,
      isLoadingMessages: false,
      parsedEvents: [],
      webSocketStatus: "DISCONNECTED",
    });

    renderWithInitialData(initialData);

    // Wait and verify no send
    await waitFor(() => {
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  test("should not send when loading messages", async () => {
    const initialData = {
      initialMessage: "Test message",
      mode: "AGENTIC" as const,
      agenticQaTest: false,
      framework: "auto",
      attachments: [],
    };

    // Connected but loading messages
    (useWsClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      send: mockSend,
      isLoadingMessages: true,
      parsedEvents: [],
      webSocketStatus: "CONNECTED",
    });

    renderWithInitialData(initialData);

    // Wait and verify no send
    await waitFor(() => {
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  test("should clear navigation state after sending", async () => {
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    const initialData = {
      initialMessage: "Test message",
      mode: "AGENTIC" as const,
      agenticQaTest: false,
      framework: "auto",
      attachments: [],
    };

    const { rerender } = renderWithInitialData(initialData);

    // Simulate WebSocket connection
    (useWsClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      send: mockSend,
      isLoadingMessages: false,
      parsedEvents: [],
      webSocketStatus: "CONNECTED",
    });

    rerender(
      <InitialDataContext.Provider value={initialData}>
        <ChatInterface />
      </InitialDataContext.Provider>,
    );

    await waitFor(() => {
      expect(replaceStateSpy).toHaveBeenCalledWith({}, document.title);
    });
  });

  test("should handle file validation errors", async () => {
    const mockFile = new File(["content"], "test.txt", { type: "text/plain" });

    const initialData = {
      initialMessage: "Process file",
      mode: "AGENTIC" as const,
      agenticQaTest: true,
      framework: "expo",
      attachments: [mockFile],
    };

    // Mock file validation to fail for this test
    const { validateFiles } = await import("#/utils/file-validation");
    (validateFiles as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      valid: false,
      errors: ["File type not allowed"],
    });

    const { rerender } = renderWithInitialData(initialData);

    // Simulate WebSocket connection
    (useWsClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      send: mockSend,
      isLoadingMessages: false,
      parsedEvents: [],
      webSocketStatus: "CONNECTED",
    });

    rerender(
      <InitialDataContext.Provider value={initialData}>
        <ChatInterface />
      </InitialDataContext.Provider>,
    );

    // Should not send message due to validation error
    await waitFor(() => {
      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});
