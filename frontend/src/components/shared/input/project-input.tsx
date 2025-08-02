import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FiPaperclip, FiArrowUp } from "react-icons/fi";
import { cn } from "#/utils/utils";
import { Spotlight } from "../../../../components/motion-primitives/spotlight";
import { TextLoop } from "../../../../components/motion-primitives/text-loop";

interface ProjectInputProps {
  placeholder?: string;
  onSend?: (message: string) => void;
  onAttach?: () => void;
  disabled?: boolean;
  className?: string;
  showSuggestions?: boolean;
}

export function ProjectInput({
  placeholder,
  onSend,
  onAttach,
  disabled = false,
  className,
  showSuggestions = true,
}: ProjectInputProps) {
  const { t } = useTranslation();
  const suggestions = [
    "Creator recipe sharing platform",
    "Creative food tracker clone Spotify",
    "Social media management dashboard",
    "Fitness tracking mobile app",
    "AI-powered learning assistant"
  ];

  const quickSuggestions = [
    "Write documentation",
    "Optimize performance",
    "Find and fix 3 bugs"
  ];

  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState(suggestions[0]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && onSend) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === "Tab" && !message.trim() && currentSuggestion) {
      e.preventDefault();
      setMessage(currentSuggestion);
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

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
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
  }, [message]);


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
          <div className="relative flex items-end bg-white dark:bg-gray-800 rounded-xl shadow-sm focus-within:ring-1 focus-within:ring-primary dark:focus-within:ring-primary focus-within:border-primary dark:focus-within:border-primary transition-colors">
          {/* Attach button */}
          <button
            type="button"
            onClick={onAttach}
            disabled={disabled}
            className={cn(
              "flex items-center justify-center w-8 h-8 ml-3 mb-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700",
              disabled && "opacity-50 cursor-not-allowed",
            )}
            aria-label="Attach file"
          >
            <FiPaperclip size={16} />
          </button>

          {/* Textarea field with animated placeholder */}
          <div className="relative flex-1">
            {!message.trim() && (
              <div className="absolute left-2 top-3 text-lg text-gray-500 dark:text-gray-400 pointer-events-none select-none flex items-center gap-2">
                <TextLoop
                  interval={3}
                  trigger={!message.trim()}
                  onIndexChange={handleIndexChange}
                >
                  {suggestions.map((suggestion, index) => (
                    <span key={index} className="flex items-center gap-2">
                      {suggestion}
                      <span className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-xs text-gray-600 dark:text-gray-300 font-mono">
                        tab
                      </span>
                    </span>
                  ))}
                </TextLoop>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder=""
              disabled={disabled}
              rows={1}
              style={{ minHeight: "90px" }}
              className={cn(
                "w-full py-3 px-2 text-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 bg-transparent border-none outline-none resize-none overflow-y-auto",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            />
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={disabled || !message.trim()}
            className={cn(
              "flex items-center justify-center w-8 h-8 mr-3 mb-3 text-white rounded-full transition-colors",
              message.trim() && !disabled
                ? "bg-primary hover:bg-primary/80 dark:bg-primary/80 dark:hover:bg-primary"
                : "bg-gray-300 dark:bg-gray-600 cursor-not-allowed",
            )}
            aria-label="Send message"
          >
            <FiArrowUp size={22} />
          </button>
          </div>
        </div>
      </form>

      {/* Quick Suggestions */}
      {showSuggestions && (
        <div className="mt-4 flex flex-wrap gap-2">
          {quickSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={disabled}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 cursor-pointer",
                "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                disabled && "opacity-50 cursor-not-allowed hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
              )}
            >
              <span className="text-gray-500 dark:text-gray-400">
                {index === 0 && "📝"}
                {index === 1 && "⚡"}
                {index === 2 && "🐛"}
              </span>
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
