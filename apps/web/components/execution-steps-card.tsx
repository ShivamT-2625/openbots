"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@openbots/ui/components/accordion";
import { Badge } from "@openbots/ui/components/badge";
import { Spinner } from "@openbots/ui/components/spinner";
import { IconCheck, IconTool, IconX } from "@tabler/icons-react";

export type StepItem = {
  id?: string;
  stepNumber: number;
  type: "model" | "tool";
  status: "running" | "completed" | "failed";
  toolName?: string | null;
  toolCallId?: string | null;
  toolInput?: unknown;
  toolOutput?: unknown;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
};

interface ExecutionStepsCardProps {
  steps: StepItem[];
  isLive?: boolean;
}

function sanitizeDisplayData(data: unknown): string {
  if (data === undefined || data === null) return "None";
  try {
    const raw = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    // Sanitize any accidental secrets or keys
    return raw
      .replace(/AIzaSy[a-zA-Z0-9_-]{20,}/g, "[REDACTED_GEMINI_KEY]")
      .replace(/tr_(dev|prod)_[a-zA-Z0-9_-]{20,}/g, "[REDACTED_TRIGGER_KEY]")
      .replace(/sk-[a-zA-Z0-9_-]{20,}/g, "[REDACTED_API_KEY]")
      .replace(/Bearer\s+[a-zA-Z0-9_.-]+/gi, "Bearer [REDACTED_TOKEN]");
  } catch {
    return String(data);
  }
}

export function ExecutionStepsCard({ steps, isLive }: ExecutionStepsCardProps) {
  const toolSteps = steps.filter((s) => s.type === "tool" || s.toolName);

  if (toolSteps.length === 0) {
    if (isLive) {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Spinner className="size-3.5" />
          <span>Agent is reasoning and preparing tools...</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-border bg-card/60 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <IconTool className="size-4 text-muted-foreground" />
          <span className="font-mono text-xs font-medium text-foreground">
            Tool Activity ({toolSteps.length})
          </span>
        </div>
        {isLive && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Spinner className="size-3" />
            <span className="text-[11px]">Executing...</span>
          </div>
        )}
      </div>

      <Accordion className="w-full divide-y divide-border/40">
        {toolSteps.map((step) => {
          const stepKey = step.id || `step-${step.stepNumber}`;
          return (
            <AccordionItem
              key={stepKey}
              value={stepKey}
              className="border-none px-3"
            >
              <AccordionTrigger className="py-2.5 hover:no-underline">
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="font-mono font-semibold text-foreground">
                    {step.toolName || "tool_call"}
                  </span>
                  {step.status === "completed" && (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <IconCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
                      Completed
                    </Badge>
                  )}
                  {step.status === "running" && (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Spinner className="size-2.5" />
                      Running
                    </Badge>
                  )}
                  {step.status === "failed" && (
                    <Badge variant="destructive" className="gap-1 text-[10px]">
                      <IconX className="size-3" />
                      Failed
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 text-xs">
                <div className="space-y-2 rounded-md bg-muted/50 p-2.5 font-mono text-[11px]">
                  <div>
                    <div className="mb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Input Parameters
                    </div>
                    <pre className="max-h-40 overflow-x-auto rounded bg-background/80 p-2 text-foreground/90 whitespace-pre-wrap">
                      {sanitizeDisplayData(step.toolInput)}
                    </pre>
                  </div>
                  {step.toolOutput !== undefined && (
                    <div>
                      <div className="mb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Tool Result
                      </div>
                      <pre className="max-h-48 overflow-x-auto rounded bg-background/80 p-2 text-foreground/90 whitespace-pre-wrap">
                        {sanitizeDisplayData(step.toolOutput)}
                      </pre>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
