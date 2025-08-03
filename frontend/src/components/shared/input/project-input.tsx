import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FiPaperclip, FiArrowUp } from "react-icons/fi";
import { cn } from "#/utils/utils";
import { InteractionMode } from "../mode-selector";
import { Spotlight } from "../../../../components/motion-primitives/spotlight";
import { TextLoop } from "../../../../components/motion-primitives/text-loop";

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
}

export function ProjectInput({
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
}: ProjectInputProps) {
  const { t } = useTranslation();
  const suggestions = [
    "Creator recipe sharing platform",
    "Creative food tracker clone Spotify",
    "Social media management dashboard",
    "Fitness tracking mobile app",
    "AI-powered learning assistant"
  ];


  const [isFocused, setIsFocused] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState(suggestions[0]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleClick = () => {
    textareaRef.current?.focus();
  };

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
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
      const maxHeight = lineHeight * 8;

      const scrollHeight = textarea.scrollHeight;
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


  return (
    <div className={cn("w-full", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative overflow-hidden rounded-xl bg-zinc-300/30 p-[1px] dark:bg-zinc-700/30">
          <Spotlight
            className="from-primary via-primary/70 to-primary/0 blur-2xl dark:from-primary dark:via-primary/70 dark:to-primary/0"
            size={160}
          />
          <div
            className="relative flex items-end bg-muted rounded-xl shadow-sm focus-within:ring-1 focus-within:ring-primary dark:focus-within:ring-primary focus-within:border-primary dark:focus-within:border-primary transition-colors cursor-text"
            onClick={handleClick}
          >


            {/* Textarea field with animated placeholder */}
            <div className="relative flex-1 flex flex-col">
              {/* Textarea with animated placeholder */}
              <div className="relative flex-1">
                {!value.trim() && (
                  <div className="absolute left-2 top-3 text-lg text-gray-500 dark:text-gray-400 pointer-events-none select-none flex items-center gap-2">
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
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  placeholder=""
                  disabled={disabled}
                  rows={1}
                  style={{ minHeight: "90px" }}
                  className={cn(
                    "z-10 relative w-full h-full py-3 px-2 text-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 bg-transparent border-none outline-none resize-none overflow-y-auto",
                    disabled && "opacity-50 cursor-not-allowed",
                  )}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-end self-end z-10 p-1">
              <button
                type="button"
                onClick={onAttach}
                disabled={disabled || (mode === 'AGENTIC' && !agenticQaTest) || mode === 'CHAT'}
                className={cn(
                  "flex items-center justify-center w-8 h-8 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700",
                  (disabled || (mode === 'AGENTIC' && !agenticQaTest) || mode === 'CHAT') && "opacity-50 cursor-not-allowed",
                )}
                aria-label="Attach file"
              >
                <FiPaperclip size={16} />
              </button>

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
      </form>


    </div>
  );
}
