"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@openbots/ui/components/alert";
import { Badge } from "@openbots/ui/components/badge";
import { Bubble, BubbleContent } from "@openbots/ui/components/bubble";
import { Button } from "@openbots/ui/components/button";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageGroup,
  MessageHeader,
} from "@openbots/ui/components/message";
import { ScrollArea } from "@openbots/ui/components/scroll-area";
import { Spinner } from "@openbots/ui/components/spinner";
import {
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconPlayerStop,
  IconRobot,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import * as React from "react";
import { ExecutionStepsCard, type StepItem } from "./execution-steps-card";
import type { RunRecord } from "./run-history-sheet";

export type MessageItem = {
  id: string;
  conversationId: string;
  role: "system" | "user" | "assistant" | "tool";
  content: unknown;
  createdAt: string | Date;
};

interface ConversationTimelineProps {
  messages: MessageItem[];
  activeRun: RunRecord | null;
  activeRunSteps: StepItem[];
  onCancelRun?: () => void;
  isCancelling?: boolean;
  agentName: string;
}

function getMessageText(content: unknown): string {
  if (content === null || content === undefined) return "";
  if (typeof content === "string") return content;
  if (typeof content === "object") {
    const obj = content as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.prompt === "string") return obj.prompt;
    return JSON.stringify(obj, null, 2);
  }
  return String(content);
}

function formatMsgTime(dateVal: string | Date): string {
  try {
    const d = new Date(dateVal);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function ConversationTimeline({
  messages,
  activeRun,
  activeRunSteps,
  onCancelRun,
  isCancelling,
  agentName,
}: ConversationTimelineProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages or steps change
  React.useEffect(() => {
    if (messages.length > 0 || activeRun || activeRunSteps.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeRun, activeRunSteps]);

  const isActiveRunOngoing =
    activeRun?.status === "queued" || activeRun?.status === "running";

  return (
    <ScrollArea className="flex-1 px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.length === 0 && !activeRun && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <IconRobot className="size-6" />
            </div>
            <h3 className="font-heading text-sm font-medium text-foreground">
              Ready to chat with {agentName}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Send a task or query below. The agent will execute tool steps as
              needed and return the verified output.
            </p>
          </div>
        )}

        {/* Existing Persisted Messages */}
        <MessageGroup>
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            const text = getMessageText(msg.content);

            return (
              <Message
                key={msg.id}
                align={isUser ? "end" : "start"}
                className="gap-3"
              >
                {!isUser && (
                  <MessageAvatar className="size-7 bg-primary text-primary-foreground">
                    <IconRobot className="size-4" />
                  </MessageAvatar>
                )}

                <MessageContent>
                  <MessageHeader className="gap-2">
                    <span className="font-semibold text-foreground">
                      {isUser ? "You" : agentName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatMsgTime(msg.createdAt)}
                    </span>
                  </MessageHeader>

                  <Bubble
                    variant={isUser ? "secondary" : "outline"}
                    align={isUser ? "end" : "start"}
                  >
                    <BubbleContent className="p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap sm:text-sm">
                      {text}
                    </BubbleContent>
                  </Bubble>
                </MessageContent>

                {isUser && (
                  <MessageAvatar className="size-7 bg-muted text-muted-foreground">
                    <IconUser className="size-4" />
                  </MessageAvatar>
                )}
              </Message>
            );
          })}
        </MessageGroup>

        {/* Live Active Run Stream */}
        {activeRun && (
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-foreground">
                  Run State:
                </span>
                {activeRun.status === "queued" && (
                  <Badge
                    variant="outline"
                    className="gap-1 font-mono text-[10px]"
                  >
                    <IconClock className="size-3" />
                    queued
                  </Badge>
                )}
                {activeRun.status === "running" && (
                  <Badge
                    variant="outline"
                    className="gap-1 font-mono text-[10px] border-primary/40 bg-primary/5 text-primary"
                  >
                    <Spinner className="size-2.5" />
                    running
                  </Badge>
                )}
                {activeRun.status === "completed" && (
                  <Badge
                    variant="secondary"
                    className="gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400"
                  >
                    <IconCheck className="size-3" />
                    completed
                  </Badge>
                )}
                {activeRun.status === "cancelled" && (
                  <Badge
                    variant="outline"
                    className="gap-1 font-mono text-[10px] text-muted-foreground"
                  >
                    <IconX className="size-3" />
                    cancelled
                  </Badge>
                )}
                {activeRun.status === "failed" && (
                  <Badge
                    variant="destructive"
                    className="gap-1 font-mono text-[10px]"
                  >
                    <IconAlertCircle className="size-3" />
                    failed
                  </Badge>
                )}
              </div>

              {isActiveRunOngoing && onCancelRun && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onCancelRun}
                  disabled={isCancelling}
                  className="h-6 gap-1 px-2 text-[11px]"
                >
                  {isCancelling ? (
                    <Spinner className="size-2.5" />
                  ) : (
                    <IconPlayerStop className="size-3" />
                  )}
                  Cancel Run
                </Button>
              )}
            </div>

            {/* Execution Tool Steps */}
            <ExecutionStepsCard
              steps={activeRunSteps}
              isLive={isActiveRunOngoing}
            />

            {/* Error or Cancellation Notification */}
            {Boolean(activeRun.status === "failed" && activeRun.error) && (
              <Alert variant="destructive">
                <IconAlertCircle className="size-4" />
                <AlertTitle>Execution Failed</AlertTitle>
                <AlertDescription className="font-mono text-xs">
                  {activeRun.error}
                </AlertDescription>
              </Alert>
            )}

            {activeRun.status === "cancelled" && (
              <Alert>
                <IconPlayerStop className="size-4" />
                <AlertTitle>Run Cancelled</AlertTitle>
                <AlertDescription className="text-xs">
                  The active run was safely halted and terminal state persisted.
                </AlertDescription>
              </Alert>
            )}

            {/* Live final response if completed before message refetch */}
            {Boolean(activeRun.status === "completed" && activeRun.output) && (
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="mb-1 text-[11px] font-semibold text-muted-foreground">
                  {agentName} Final Response
                </div>
                <div className="text-xs leading-relaxed text-foreground whitespace-pre-wrap sm:text-sm">
                  {typeof activeRun.output === "string"
                    ? activeRun.output
                    : typeof (activeRun.output as Record<string, unknown>)?.text ===
                        "string"
                      ? String((activeRun.output as Record<string, unknown>).text)
                      : JSON.stringify(activeRun.output, null, 2)}
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
