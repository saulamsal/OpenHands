import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FiPaperclip, FiArrowUp, FiX } from "react-icons/fi";
import { ChevronDown } from "lucide-react";
import { cn } from "#/utils/utils";
import { InteractionMode } from "../mode-selector";
import { TextLoop } from "../../../../components/motion-primitives/text-loop";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Button } from "#/components/ui/button";

interface ProjectInputProps {
  placeholder?: string;
  onSend?: (message: string) => void;
  onAttach?: () => void;
  disabled?: boolean;
  className?: string;
  value: string;
  onChange: (value: string) => void;
  onSuggestionClick: (suggestion: string) => void;
  mode: InteractionMode;
  agenticQaTest: boolean;
  onModeChange: (mode: InteractionMode) => void;
  onAgenticQaTestChange: (enabled: boolean) => void;
  attachments?: File[];
  onRemoveAttachment?: (index: number) => void;
  onFilesSelected?: (files: File[]) => void;
}

export const ProjectInput = React.forwardRef<
  HTMLTextAreaElement,
  ProjectInputProps
>(
  (
    {
      placeholder,
      onSend,
      onAttach,
      disabled = false,
      className,
      value,
      onChange,
      onSuggestionClick,
      mode,
      agenticQaTest,
      onModeChange,
      onAgenticQaTestChange,
      attachments = [],
      onRemoveAttachment,
      onFilesSelected,
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const suggestions = [
      "Creator recipe sharing platform",
      "Creative food tracker clone Spotify",
      "Social media management dashboard",
      "Fitness tracking mobile app",
      "AI-powered learning assistant",
    ];

    const [isFocused, setIsFocused] = useState(false);
    const [currentSuggestion, setCurrentSuggestion] = useState(suggestions[0]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Combine external ref with internal ref
    React.useImperativeHandle(ref, () => textareaRef.current!);

    const handleClick = () => {
      textareaRef.current?.focus();
    };

    const renderModeDropdown = () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            className="flex items-center gap-2 h-8 rounded-full border-0"
          >
            {mode === "AGENTIC"
              ? agenticQaTest
                ? "Agentic MAX"
                : "Agentic"
              : "Chat"}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() => {
              onModeChange("AGENTIC");
              onAgenticQaTestChange(false);
            }}
          >
            Agentic
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              onModeChange("AGENTIC");
              onAgenticQaTestChange(true);
            }}
          >
            <div className="flex flex-col">
              <span>Agentic MAX</span>
              <span className="text-xs text-muted-foreground">
                Include QA & Testing
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onModeChange("CHAT")}>
            Chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (value.trim() && onSend) {
        onSend(value.trim());
        onChange("");
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      } else if (e.key === "Tab" && !value.trim() && currentSuggestion) {
        e.preventDefault();
        onChange(currentSuggestion);
      }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            pastedFiles.push(file);
          }
        }
      }

      if (pastedFiles.length > 0 && onFilesSelected) {
        onFilesSelected(pastedFiles);
      }
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = () => {
      setIsFocused(false);
    };

    const handleIndexChange = (index: number) => {
      setCurrentSuggestion(suggestions[index]);
    };

    // Auto-resize textarea with 8-line limit
    useEffect(() => {
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = "auto";

        // Calculate line height and max height for 8 lines
        const lineHeight =
          parseInt(getComputedStyle(textarea).lineHeight) || 20;
        const maxHeight = lineHeight * 8;

        const { scrollHeight } = textarea;
        textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      }
    }, [value]);

    // return (
    //   <div className='relative aspect-video h-[200px] overflow-hidden rounded-xl bg-zinc-300/30 p-[1px] dark:bg-zinc-700/30'>
    //     <Spotlight
    //       className='from-blue-600 via-blue-500 to-blue-400 blur-3xl dark:from-blue-200 dark:via-blue-300 dark:to-blue-400'
    //       size={124}
    //     />
    //     <div className='relative h-full w-full rounded-xl bg-white dark:bg-black'></div>
    //   </div>
    // );

    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
    };

    return (
      <div className={cn("w-full", className)}>
        {/* Attachments display */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm"
              >
                <FiPaperclip className="h-4 w-4 text-gray-500" />
                <span className="max-w-[200px] truncate">{file.name}</span>
                <span className="text-xs text-gray-500">
                  ({formatFileSize(file.size)})
                </span>
                {onRemoveAttachment && (
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(index)}
                    className="ml-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <FiX className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="relative rounded-xl  p-[1px] ">
            <div
              className={cn(
                "flex flex-col w-full relative rounded-2xl border-1  bg-muted  transition-all duration-300 ease-in-out",
                isFocused
                  ? "border-primary dark:border-primary shadow-lg"
                  : "border-transparent ",
                className,
              )}
              onClick={handleClick}
            >
              <div className="relative flex-1">
                {!value.trim() && (
                  <div className="absolute left-3 top-3 text-lg text-gray-500 dark:text-gray-400 pointer-events-none select-none flex items-center gap-2">
                    <TextLoop
                      interval={3}
                      trigger={!value.trim()}
                      onIndexChange={handleIndexChange}
                    >
                      {suggestions.map((suggestion, index) => (
                        <span key={index} className="flex items-center gap-2">
                          {suggestion}
                          <span className="inline-flex items-center rounded-md border border-color-muted-foreground bg-muted px-1.5 py-0.5 text-sm text-color-foreground font-mono">
                            tab
                          </span>
                        </span>
                      ))}
                    </TextLoop>
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  placeholder=""
                  disabled={disabled}
                  rows={1}
                  style={{ minHeight: "90px" }}
                  className={cn(
                    "z-10 relative w-full h-full py-3 px-3 text-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 bg-transparent border-none outline-none resize-none overflow-y-auto",
                    disabled && "opacity-50 cursor-not-allowed",
                  )}
                />
              </div>

              <div className="flex flex-row items-center self-end z-10 p-1 relative py-3">
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAttach?.();
                    }}
                    disabled={
                      disabled ||
                      (mode === "AGENTIC" && !agenticQaTest) ||
                      mode === "CHAT"
                    }
                    className={cn(
                      "flex items-center justify-center w-8 h-8 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700",
                      (disabled ||
                        (mode === "AGENTIC" && !agenticQaTest) ||
                        mode === "CHAT") &&
                        "opacity-50 cursor-not-allowed",
                    )}
                    aria-label="Attach file"
                  >
                    <FiPaperclip size={16} />
                  </button>
                </div>

                <div className="flex flex-row mx-2 gap-2">
                  {renderModeDropdown()}
                  <button
                    type="submit"
                    disabled={disabled || !value.trim()}
                    className={cn(
                      "flex items-center justify-center w-8 h-8 ml-2 text-white rounded-full transition-colors",
                      value.trim() && !disabled
                        ? "bg-primary hover:bg-primary/80 dark:bg-primary/80 dark:hover:bg-primary"
                        : "bg-gray-300 dark:bg-gray-600 cursor-not-allowed",
                    )}
                    aria-label="Send message"
                  >
                    <FiArrowUp size={22} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  },
);

ProjectInput.displayName = "ProjectInput";
