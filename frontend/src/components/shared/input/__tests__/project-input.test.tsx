import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, test, expect, beforeEach } from "vitest";
import { ProjectInput } from "../project-input";

describe("ProjectInput", () => {
  const mockProps = {
    value: "",
    onChange: vi.fn(),
    onSend: vi.fn(),
    onAttach: vi.fn(),
    onSuggestionClick: vi.fn(),
    mode: "AGENTIC" as const,
    agenticQaTest: false,
    onModeChange: vi.fn(),
    onAgenticQaTestChange: vi.fn(),
    onFilesSelected: vi.fn(),
    onRemoveAttachment: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders input field with placeholder", () => {
    render(<ProjectInput {...mockProps} placeholder="What are we building?" />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeInTheDocument();
  });

  test("handles text input", async () => {
    const user = userEvent.setup();
    render(<ProjectInput {...mockProps} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Build a React app");

    // userEvent.type calls onChange for each character
    expect(mockProps.onChange).toHaveBeenCalledTimes(17); // "Build a React app" has 17 characters
    expect(mockProps.onChange).toHaveBeenLastCalledWith("p"); // last character typed
  });

  test("handles send on Enter key", async () => {
    const user = userEvent.setup();
    render(<ProjectInput {...mockProps} value="Test message" />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "{Enter}");

    expect(mockProps.onSend).toHaveBeenCalledWith("Test message");
  });

  test("prevents send on Shift+Enter", async () => {
    const user = userEvent.setup();
    render(<ProjectInput {...mockProps} value="Test message" />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "{Shift>}{Enter}{/Shift}");

    expect(mockProps.onSend).not.toHaveBeenCalled();
  });

  test("handles Tab key to accept suggestion", async () => {
    const user = userEvent.setup();
    render(<ProjectInput {...mockProps} value="" />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "{Tab}");

    // Should set the current suggestion
    expect(mockProps.onChange).toHaveBeenCalledWith(
      expect.stringContaining("Creator recipe sharing platform"),
    );
  });

  test("displays attachments", () => {
    const attachments = [
      new File(["content1"], "file1.txt", { type: "text/plain" }),
      new File(["content2"], "file2.pdf", { type: "application/pdf" }),
    ];

    render(<ProjectInput {...mockProps} attachments={attachments} />);

    expect(screen.getByText("file1.txt")).toBeInTheDocument();
    expect(screen.getByText("file2.pdf")).toBeInTheDocument();
  });

  test("removes attachment on X click", () => {
    const attachments = [
      new File(["content"], "file.txt", { type: "text/plain" }),
    ];

    render(<ProjectInput {...mockProps} attachments={attachments} />);

    const removeButton = screen.getByRole("button", { name: "" });
    fireEvent.click(removeButton);

    expect(mockProps.onRemoveAttachment).toHaveBeenCalledWith(0);
  });

  test("handles image paste", async () => {
    render(<ProjectInput {...mockProps} />);

    const textarea = screen.getByRole("textbox");

    const imageFile = new File(["image"], "test.png", { type: "image/png" });

    // Create a mock clipboard event
    const pasteEvent = {
      clipboardData: {
        items: [
          {
            type: "image/png",
            getAsFile: () => imageFile,
          },
        ],
      },
      preventDefault: vi.fn(),
    };

    fireEvent.paste(textarea, pasteEvent);

    expect(mockProps.onFilesSelected).toHaveBeenCalledWith([imageFile]);
  });

  test("opens mode dropdown on click", async () => {
    const user = userEvent.setup();
    render(<ProjectInput {...mockProps} />);

    const modeButton = screen.getByText("Agentic");
    await user.click(modeButton);

    expect(screen.getByText("Agentic MAX")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  test("changes mode to Agentic MAX", async () => {
    const user = userEvent.setup();
    render(<ProjectInput {...mockProps} />);

    const modeButton = screen.getByText("Agentic");
    await user.click(modeButton);

    const agenticMaxOption = screen.getByText("Agentic MAX");
    await user.click(agenticMaxOption);

    expect(mockProps.onModeChange).toHaveBeenCalledWith("AGENTIC");
    expect(mockProps.onAgenticQaTestChange).toHaveBeenCalledWith(true);
  });

  test("changes mode to Chat", async () => {
    const user = userEvent.setup();
    render(<ProjectInput {...mockProps} />);

    const modeButton = screen.getByText("Agentic");
    await user.click(modeButton);

    const chatOption = screen.getByText("Chat");
    await user.click(chatOption);

    expect(mockProps.onModeChange).toHaveBeenCalledWith("CHAT");
  });

  test("displays Agentic MAX when agenticQaTest is true", () => {
    render(<ProjectInput {...mockProps} agenticQaTest />);

    expect(screen.getByText("Agentic MAX")).toBeInTheDocument();
  });

  test("displays Chat when mode is CHAT", () => {
    render(<ProjectInput {...mockProps} mode="CHAT" />);

    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  test("disables attach button in non-MAX modes", () => {
    render(
      <ProjectInput {...mockProps} mode="AGENTIC" agenticQaTest={false} />,
    );

    const attachButton = screen.getByRole("button", { name: "Attach file" });
    expect(attachButton).toBeDisabled();
  });

  test("enables attach button in Agentic MAX mode", () => {
    render(<ProjectInput {...mockProps} mode="AGENTIC" agenticQaTest />);

    const attachButton = screen.getByRole("button", { name: "Attach file" });
    expect(attachButton).not.toBeDisabled();
  });

  test("disables attach button in Chat mode", () => {
    render(<ProjectInput {...mockProps} mode="CHAT" />);

    const attachButton = screen.getByRole("button", { name: "Attach file" });
    expect(attachButton).toBeDisabled();
  });

  test("disables send button when value is empty", () => {
    render(<ProjectInput {...mockProps} value="" />);

    const sendButton = screen.getByRole("button", { name: "Send message" });
    expect(sendButton).toBeDisabled();
  });

  test("enables send button when value is not empty", () => {
    render(<ProjectInput {...mockProps} value="Test message" />);

    const sendButton = screen.getByRole("button", { name: "Send message" });
    expect(sendButton).not.toBeDisabled();
  });

  test("triggers attach callback on attach button click", () => {
    render(<ProjectInput {...mockProps} mode="AGENTIC" agenticQaTest />);

    const attachButton = screen.getByRole("button", { name: "Attach file" });
    fireEvent.click(attachButton);

    expect(mockProps.onAttach).toHaveBeenCalled();
  });

  test("formats file sizes correctly", () => {
    // Create files with proper sizes using constructor
    const smallFile = new File(["x".repeat(500)], "small.txt", {
      type: "text/plain",
    });
    const mediumFile = new File(["x".repeat(1024 * 500)], "medium.txt", {
      type: "text/plain",
    });
    const largeFile = new File(
      ["x".repeat(Math.floor(1024 * 1024 * 2.5))],
      "large.txt",
      { type: "text/plain" },
    );

    const attachments = [smallFile, mediumFile, largeFile];

    render(<ProjectInput {...mockProps} attachments={attachments} />);

    // Check that file names are displayed
    expect(screen.getByText("small.txt")).toBeInTheDocument();
    expect(screen.getByText("medium.txt")).toBeInTheDocument();
    expect(screen.getByText("large.txt")).toBeInTheDocument();

    // File sizes should be formatted and displayed
    // Check that each file size format appears
    expect(screen.getByText("(500 Bytes)")).toBeInTheDocument();
    expect(screen.getByText("(500 KB)")).toBeInTheDocument();
    expect(screen.getByText("(2.5 MB)")).toBeInTheDocument();
  });
});
