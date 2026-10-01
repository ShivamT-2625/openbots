"use client"

import { Button } from "@openbots/ui/components/button"
import { Spinner } from "@openbots/ui/components/spinner"
import { Textarea } from "@openbots/ui/components/textarea"
import { IconArrowUp, IconPlayerStop } from "@tabler/icons-react"
import * as React from "react"

interface InputComposerProps {
  onSend: (prompt: string) => void
  isSubmitting?: boolean
  isActiveRun?: boolean
  onCancelRun?: () => void
  isCancelling?: boolean
  placeholder?: string
  disabled?: boolean
}

export function InputComposer({
  onSend,
  isSubmitting,
  isActiveRun,
  onCancelRun,
  isCancelling,
  placeholder = "Message your agent...",
  disabled,
}: InputComposerProps) {
  const [text, setText] = React.useState("")
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()

    const trimmed = text.trim()

    if (!trimmed || isSubmitting || isActiveRun || disabled) {
      return
    }

    onSend(trimmed)
    setText("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="w-full px-3 pb-3">
      <div className="mx-auto max-w-3xl">
        <form onSubmit={handleSubmit}>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-background ring-border transition focus-within:ring-2">
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isSubmitting || isActiveRun}
              rows={1}
              className="max-h-48 min-h-12 resize-none border-0 bg-transparent px-4 py-3.5 pr-14 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />

            <div className="absolute right-2 bottom-2">
              {isActiveRun && onCancelRun ? (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={onCancelRun}
                  disabled={isCancelling}
                  className="size-8 rounded-full"
                >
                  {isCancelling ? (
                    <Spinner />
                  ) : (
                    <IconPlayerStop className="size-4" />
                  )}
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!text.trim() || isSubmitting || disabled}
                  className="size-8 rounded-full"
                >
                  {isSubmitting ? (
                    <Spinner />
                  ) : (
                    <IconArrowUp className="size-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
