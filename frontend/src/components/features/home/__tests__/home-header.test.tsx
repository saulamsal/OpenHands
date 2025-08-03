import { screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, test, expect, beforeEach } from "vitest";
import { useNavigate } from "react-router";
import { HomeHeader } from "../home-header";
import { useCreateConversation } from "#/hooks/mutation/use-create-conversation";
import { useIsCreatingConversation } from "#/hooks/use-is-creating-conversation";
import { useAuth } from "#/context/auth-context";
import { useConfig } from "#/hooks/query/use-config";
import { useUserProviders } from "#/hooks/use-user-providers";
import { renderWithProviders } from "../../../../../test-utils";

// Mock dependencies
vi.mock("react-router", () => ({
  useNavigate: vi.fn(),
}));

vi.mock("#/hooks/mutation/use-create-conversation");
vi.mock("#/hooks/use-is-creating-conversation");
vi.mock("#/context/auth-context");
vi.mock("#/hooks/query/use-config");
vi.mock("#/hooks/use-user-providers");

describe("HomeHeader", () => {
  const mockNavigate = vi.fn();
  const mockCreateConversation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      mockNavigate,
    );

    (
      useCreateConversation as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      mutate: mockCreateConversation,
      isPending: false,
      isSuccess: false,
    });

    (
      useIsCreatingConversation as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(false);

    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    (useConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { APP_MODE: "saas" },
    });

    (useUserProviders as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      providers: [],
    });
  });

  test("renders home header with input field", () => {
    renderWithProviders(<HomeHeader />);

    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByText("HOME$LETS_START_BUILDING")).toBeInTheDocument();
  });

  test("creates conversation with message", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomeHeader />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Build a React app");

    const sendButton = screen.getByRole("button", { name: "Send message" });
    await user.click(sendButton);

    expect(mockCreateConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "Build a React app",
        mode: "AGENTIC",
        agenticQaTest: true,
        framework: "expo",
        attachments: [],
      }),
      expect.any(Object),
    );
  });

  test("navigates to conversation on success", async () => {
    let onSuccessCallback: any;

    (
      useCreateConversation as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      mutate: (params: any, options: any) => {
        onSuccessCallback = options.onSuccess;
        mockCreateConversation(params, options);
      },
      isPending: false,
      isSuccess: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<HomeHeader />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Test message");

    const sendButton = screen.getByRole("button", { name: "Send message" });
    await user.click(sendButton);

    // Simulate success callback
    onSuccessCallback({ conversation_id: "test-123" });

    expect(mockNavigate).toHaveBeenCalledWith(
      "/conversations/test-123",
      expect.objectContaining({
        state: expect.objectContaining({
          initialMessage: "Test message",
          mode: "AGENTIC",
          agenticQaTest: true,
          framework: "expo",
          attachments: [],
        }),
      }),
    );
  });

  test("redirects to login if not authenticated", async () => {
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<HomeHeader />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Test message");

    const sendButton = screen.getByRole("button", { name: "Send message" });
    await user.click(sendButton);

    expect(mockNavigate).toHaveBeenCalledWith("/login");
    expect(mockCreateConversation).not.toHaveBeenCalled();
  });

  test("handles file selection", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomeHeader />);

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const file = new File(["content"], "test.txt", { type: "text/plain" });
    Object.defineProperty(fileInput, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);

    // Now send with the file
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Process this file");

    const sendButton = screen.getByRole("button", { name: "Send message" });
    await user.click(sendButton);

    expect(mockCreateConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [file],
      }),
      expect.any(Object),
    );
  });

  test("changes mode selection", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomeHeader />);

    // Initially shows Agentic MAX
    expect(screen.getByText("Agentic MAX")).toBeInTheDocument();

    // Open dropdown
    const modeButton = screen.getByText("Agentic MAX");
    await user.click(modeButton);

    // Select Chat mode
    const chatOption = screen.getByText("Chat");
    await user.click(chatOption);

    // Now it should show Chat
    expect(screen.getByText("Chat")).toBeInTheDocument();

    // Send message with Chat mode
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Chat message");

    const sendButton = screen.getByRole("button", { name: "Send message" });
    await user.click(sendButton);

    expect(mockCreateConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "CHAT",
      }),
      expect.any(Object),
    );
  });

  test("changes framework selection", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomeHeader />);

    // Open framework dropdown
    const frameworkButton = screen.getByText("Expo");
    await user.click(frameworkButton);

    // Select Auto
    const autoOption = screen.getByText("Auto");
    await user.click(autoOption);

    // Now it should show Auto
    expect(screen.getByText("Auto")).toBeInTheDocument();

    // Send message with Auto framework
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Build app");

    const sendButton = screen.getByRole("button", { name: "Send message" });
    await user.click(sendButton);

    expect(mockCreateConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        framework: "auto",
      }),
      expect.any(Object),
    );
  });

  test("disables input when creating conversation", () => {
    (
      useCreateConversation as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      mutate: mockCreateConversation,
      isPending: true,
      isSuccess: false,
    });

    renderWithProviders(<HomeHeader />);

    const textarea = screen.getByRole("textbox");
    const sendButton = screen.getByRole("button", { name: "Send message" });

    expect(textarea).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  test("handles quick suggestions", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomeHeader />);

    // Find a suggestion button
    const suggestionButtons = screen.getAllByRole("button");
    const suggestionButton = suggestionButtons.find(
      (btn) =>
        btn.textContent?.includes("Create") ||
        btn.textContent?.includes("Build") ||
        btn.textContent?.includes("Design"),
    );

    if (suggestionButton) {
      await user.click(suggestionButton);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toBeTruthy();
    }
  });

  test("handles repository selection tab", async () => {
    (useUserProviders as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      providers: ["github"],
    });

    const user = userEvent.setup();
    renderWithProviders(<HomeHeader />);

    // Click on existing repo tab
    const repoTab = screen.getByText("Existing Repo");
    await user.click(repoTab);

    // Should open repository selection modal
    expect(
      screen.getByTestId("repository-selection-modal"),
    ).toBeInTheDocument();
  });

  test("handles 401 error on conversation creation", async () => {
    let onErrorCallback: any;

    (
      useCreateConversation as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      mutate: (params: any, options: any) => {
        onErrorCallback = options.onError;
        mockCreateConversation(params, options);
      },
      isPending: false,
      isSuccess: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<HomeHeader />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Test message");

    const sendButton = screen.getByRole("button", { name: "Send message" });
    await user.click(sendButton);

    // Simulate 401 error
    onErrorCallback({ response: { status: 401 } });

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
