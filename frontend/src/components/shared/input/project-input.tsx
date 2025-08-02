import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FiPaperclip, FiSend } from "react-icons/fi";
import { cn } from "#/utils/utils";

interface ProjectInputProps {
  placeholder?: string;
  onSend?: (message: string) => void;
  onAttach?: () => void;
  disabled?: boolean;
  className?: string;
}

export function ProjectInput({
  placeholder,
  onSend,
  onAttach,
  disabled = false,
  className,
}: ProjectInputProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
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
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  return (
    <div className={cn("w-full", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-end bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus-within:ring-1 focus-within:ring-blue-500 dark:focus-within:ring-blue-400 focus-within:border-blue-500 dark:focus-within:border-blue-400 transition-colors">
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

          {/* Textarea field */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "What are we going to build today?"}
            disabled={disabled}
            rows={1}
            className={cn(
              "flex-1 py-3 px-2 max-h-32 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 bg-transparent border-none outline-none resize-none",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={disabled || !message.trim()}
            className={cn(
              "flex items-center justify-center w-8 h-8 mr-3 mb-3 text-white rounded-lg transition-colors",
              message.trim() && !disabled
                ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                : "bg-gray-300 dark:bg-gray-600 cursor-not-allowed",
            )}
            aria-label="Send message"
          >
            <FiSend size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
