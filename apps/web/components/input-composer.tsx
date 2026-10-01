"use client";

import { Button } from "@openbots/ui/components/button";
import { Spinner } from "@openbots/ui/components/spinner";
import { Textarea } from "@openbots/ui/components/textarea";
import { IconPlayerStop, IconSend } from "@tabler/icons-react";
import * as React from "react";

interface InputComposerProps {
  onSend: (prompt: string) => void;
  isSubmitting?: boolean;
  isActiveRun?: boolean;
  onCancelRun?: () => void;
  isCancelling?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function InputComposer({
  onSend,
  isSubmitting,
  isActiveRun,
  onCancelRun,
  isCancelling,
  placeholder = "Send a task to your agent...",
  disabled,
}: InputComposerProps) {
  const [text, setText] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSubmitting || isActiveRun || disabled) return;
    onSend(trimmed);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full bg-background/95 p-3 backdrop-blur-xs sm:p-4">
      <div className="mx-auto max-w-4xl">
        <form onSubmit={handleSubmit} className="relative flex flex-col gap-2">
          <div className="relative rounded-xl border border-input bg-card shadow-xs transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
            <Textarea
              ref={textareaRef}
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isSubmitting || isActiveRun}
              className="resize-none border-none bg-transparent p-3 text-sm shadow-none focus-visible:ring-0 md:text-sm"
            />

            <div className="flex items-center justify-between border-t border-border/40 px-3 py-2 text-xs">
              <span className="hidden text-[11px] text-muted-foreground sm:inline">
                Press{" "}
                <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">
                  Enter
                </kbd>{" "}
                to submit,{" "}
                <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">
                  Shift+Enter
                </kbd>{" "}
                for newline
              </span>

              <div className="ml-auto flex items-center gap-2">
                {isActiveRun && onCancelRun && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={onCancelRun}
                    disabled={isCancelling}
                    className="h-7 px-2.5 text-xs"
                  >
                    {isCancelling ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <IconPlayerStop data-icon="inline-start" />
                    )}
                    <span>Cancel Run</span>
                  </Button>
                )}

                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    !text.trim() || isSubmitting || isActiveRun || disabled
                  }
                  className="h-7 px-2.5 text-xs"
                >
                  {isSubmitting ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <IconSend data-icon="inline-start" />
                  )}
                  <span>Send</span>
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
