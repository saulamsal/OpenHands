import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, test, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import React from "react";
import { useCreateConversation } from "../use-create-conversation";
import OpenHands from "#/api/open-hands";
import { rootReducer } from "#/store";
import { AuthProvider } from "#/context/auth-context";

// Mock dependencies
vi.mock("#/api/open-hands", () => ({
  default: {
    createConversation: vi.fn(),
  },
}));

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

vi.mock("#/context/auth-context", () => ({
  useAuth: () => ({
    activeTeam: { id: "test-team-id" },
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe("useCreateConversation", () => {
  let queryClient: QueryClient;
  let store: ReturnType<typeof configureStore>;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <AuthProvider>{children}</AuthProvider>
      </Provider>
    </QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    store = configureStore({
      reducer: rootReducer,
    });
    vi.clearAllMocks();
  });

  test("should create conversation with basic parameters", async () => {
    const mockResponse = {
      conversation_id: "test-conversation-123",
      title: "Test Conversation",
    };

    (
      OpenHands.createConversation as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useCreateConversation(), { wrapper });

    result.current.mutate({
      query: "Test message",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(OpenHands.createConversation).toHaveBeenCalledWith(
      undefined, // repository name
      undefined, // git provider
      "Test message", // query
      undefined, // suggested task
      undefined, // branch
      undefined, // conversation instructions
      undefined, // create microagent
      undefined, // mode
      undefined, // agentic qa test
      undefined, // framework
      undefined, // attachments
      "test-team-id", // team id
    );
  });

  test("should create conversation with mode and framework", async () => {
    const mockResponse = {
      conversation_id: "test-conversation-456",
      title: "Test Conversation",
    };

    (
      OpenHands.createConversation as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useCreateConversation(), { wrapper });

    result.current.mutate({
      query: "Build an Expo app",
      mode: "AGENTIC",
      agenticQaTest: true,
      framework: "expo",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(OpenHands.createConversation).toHaveBeenCalledWith(
      undefined, // repository name
      undefined, // git provider
      "Build an Expo app", // query
      undefined, // suggested task
      undefined, // branch
      undefined, // conversation instructions
      undefined, // create microagent
      "AGENTIC", // mode
      true, // agentic qa test
      "expo", // framework
      undefined, // attachments
      "test-team-id", // team id
    );
  });

  test("should create conversation with attachments", async () => {
    const mockResponse = {
      conversation_id: "test-conversation-789",
      title: "Test Conversation",
    };

    (
      OpenHands.createConversation as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useCreateConversation(), { wrapper });

    const mockFile1 = new File(["content1"], "test1.txt", {
      type: "text/plain",
    });
    const mockFile2 = new File(["content2"], "test2.png", {
      type: "image/png",
    });

    result.current.mutate({
      query: "Process these files",
      attachments: [mockFile1, mockFile2],
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(OpenHands.createConversation).toHaveBeenCalledWith(
      undefined, // repository name
      undefined, // git provider
      "Process these files", // query
      undefined, // suggested task
      undefined, // branch
      undefined, // conversation instructions
      undefined, // create microagent
      undefined, // mode
      undefined, // agentic qa test
      undefined, // framework
      [mockFile1, mockFile2], // attachments
      "test-team-id", // team id
    );
  });

  test("should create conversation with repository", async () => {
    const mockResponse = {
      conversation_id: "test-conversation-repo",
      title: "Test Conversation",
    };

    (
      OpenHands.createConversation as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useCreateConversation(), { wrapper });

    result.current.mutate({
      query: "Fix bugs in repo",
      repository: {
        name: "user/repo",
        gitProvider: "github",
        branch: "main",
      },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(OpenHands.createConversation).toHaveBeenCalledWith(
      "user/repo", // repository name
      "github", // git provider
      "Fix bugs in repo", // query
      undefined, // suggested task
      "main", // branch
      undefined, // conversation instructions
      undefined, // create microagent
      undefined, // mode
      undefined, // agentic qa test
      undefined, // framework
      undefined, // attachments
      "test-team-id", // team id
    );
  });

  test("should create conversation with all parameters", async () => {
    const mockResponse = {
      conversation_id: "test-conversation-all",
      title: "Test Conversation",
    };

    (
      OpenHands.createConversation as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useCreateConversation(), { wrapper });

    const mockFile = new File(["content"], "test.pdf", {
      type: "application/pdf",
    });

    result.current.mutate({
      query: "Build a complete app",
      repository: {
        name: "user/project",
        gitProvider: "github",
        branch: "develop",
      },
      mode: "AGENTIC",
      agenticQaTest: true,
      framework: "expo",
      attachments: [mockFile],
      conversationInstructions: "Use TypeScript",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(OpenHands.createConversation).toHaveBeenCalledWith(
      "user/project", // repository name
      "github", // git provider
      "Build a complete app", // query
      undefined, // suggested task
      "develop", // branch
      "Use TypeScript", // conversation instructions
      undefined, // create microagent
      "AGENTIC", // mode
      true, // agentic qa test
      "expo", // framework
      [mockFile], // attachments
      "test-team-id", // team id
    );
  });

  test("should invalidate queries on success", async () => {
    const mockResponse = {
      conversation_id: "test-conversation-invalidate",
      title: "Test Conversation",
    };

    (
      OpenHands.createConversation as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockResponse);

    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateConversation(), { wrapper });

    result.current.mutate({
      query: "Test query",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["user", "conversations", "test-team-id"],
    });
  });
});
