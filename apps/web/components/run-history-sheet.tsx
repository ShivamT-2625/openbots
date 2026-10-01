"use client";

import { Badge } from "@openbots/ui/components/badge";
import { Button } from "@openbots/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@openbots/ui/components/card";
import { ScrollArea } from "@openbots/ui/components/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@openbots/ui/components/sheet";
import { Spinner } from "@openbots/ui/components/spinner";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconHistory,
  IconPlayerStop,
  IconX,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { getClient } from "@/lib/api";
import { ExecutionStepsCard, type StepItem } from "./execution-steps-card";

export type RunRecord = {
  id: string;
  userId: string;
  agentId: string;
  conversationId: string | null;
  status:
    | "queued"
    | "running"
    | "waiting"
    | "completed"
    | "failed"
    | "cancelled";
  triggerType: string;
  input: unknown;
  output: unknown;
  error: string | null;
  startedAt: string | Date | null;
  completedAt: string | Date | null;
  createdAt: string | Date;
};

interface RunHistorySheetProps {
  agentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRunId?: string | null;
  onSelectRunId?: (runId: string | null) => void;
}

function formatTimestamp(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return "N/A";
  try {
    const d = new Date(dateVal);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return String(dateVal);
  }
}

function getStatusBadge(status: RunRecord["status"]) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <IconCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
          Completed
        </Badge>
      );
    case "running":
      return (
        <Badge variant="outline" className="gap-1 text-[10px]">
          <Spinner className="size-2.5" />
          Running
        </Badge>
      );
    case "queued":
      return (
        <Badge variant="outline" className="gap-1 text-[10px]">
          <IconClock className="size-3" />
          Queued
        </Badge>
      );
    case "cancelled":
      return (
        <Badge
          variant="outline"
          className="gap-1 text-[10px] text-muted-foreground"
        >
          <IconX className="size-3" />
          Cancelled
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1 text-[10px]">
          <IconAlertCircle className="size-3" />
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px]">
          {status}
        </Badge>
      );
  }
}

export function RunHistorySheet({
  agentId,
  open,
  onOpenChange,
  selectedRunId: externalSelectedRunId,
  onSelectRunId: externalOnSelectRunId,
}: RunHistorySheetProps) {
  const queryClient = useQueryClient();
  const [internalRunId, setInternalRunId] = React.useState<string | null>(null);

  const inspectedRunId =
    externalSelectedRunId !== undefined ? externalSelectedRunId : internalRunId;
  const setInspectedRunId = externalOnSelectRunId || setInternalRunId;

  // Query runs for this agent
  const { data: runsData, isLoading: isLoadingRuns } = useQuery({
    queryKey: ["runs", agentId],
    queryFn: async () => {
      if (!agentId) return { runs: [] };
      const client = getClient();
      const res = await client.api.runs.$get({
        query: { agentId },
      });
      if (!res.ok) throw new Error("Failed to fetch runs");
      return res.json() as Promise<{ runs: RunRecord[] }>;
    },
    enabled: open && !!agentId,
  });

  // Query details for inspected run
  const { data: inspectedRunData, isLoading: isLoadingInspected } = useQuery({
    queryKey: ["run", inspectedRunId],
    queryFn: async () => {
      if (!inspectedRunId) return null;
      const client = getClient();
      const res = await client.api.runs[":id"].$get({
        param: { id: inspectedRunId },
      });
      if (!res.ok) throw new Error("Failed to fetch run details");
      return res.json() as Promise<{ run: RunRecord; steps: StepItem[] }>;
    },
    enabled: open && !!inspectedRunId,
    refetchInterval: (query) => {
      const status = query.state.data?.run?.status;
      return status === "queued" || status === "running" ? 1500 : false;
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async (runId: string) => {
      const client = getClient();
      const res = await client.api.runs[":id"].cancel.$post({
        param: { id: runId },
      });
      if (!res.ok) throw new Error("Failed to cancel run");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["run", inspectedRunId] });
      queryClient.invalidateQueries({ queryKey: ["runs", agentId] });
    },
  });

  const run = inspectedRunData?.run;
  const steps = inspectedRunData?.steps || [];
  const isInspectedActive =
    run?.status === "queued" || run?.status === "running";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-2">
            {inspectedRunId && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setInspectedRunId(null)}
                aria-label="Back to history"
              >
                <IconArrowLeft className="size-4" />
              </Button>
            )}
            <SheetTitle className="flex items-center gap-2">
              <IconHistory className="size-4" />
              {inspectedRunId ? "Execution Inspector" : "Run History"}
            </SheetTitle>
          </div>
          <SheetDescription>
            {inspectedRunId
              ? "Inspect the persisted prompt, tool execution steps, and response."
              : "Review past and active runs for this agent."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden pt-2">
          {inspectedRunId ? (
            // Inspected Run Detail View
            <ScrollArea className="h-[calc(100vh-140px)] pr-2">
              {isLoadingInspected ? (
                <div className="flex items-center justify-center p-8">
                  <Spinner className="size-5" />
                </div>
              ) : !run ? (
                <p className="text-xs text-muted-foreground">Run not found.</p>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Status & Cancel Header */}
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          Status:
                        </span>
                        {getStatusBadge(run.status)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Started:{" "}
                        {formatTimestamp(run.startedAt || run.createdAt)}
                        {run.completedAt &&
                          ` • Finished: ${formatTimestamp(run.completedAt)}`}
                      </div>
                    </div>
                    {isInspectedActive && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-1"
                        onClick={() => cancelMutation.mutate(run.id)}
                        disabled={cancelMutation.isPending}
                      >
                        <IconPlayerStop className="size-3.5" />
                        Cancel Run
                      </Button>
                    )}
                  </div>

                  {/* Input Task Card */}
                  <Card size="sm">
                    <CardHeader className="py-2.5">
                      <CardTitle className="text-xs">User Task</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2.5">
                      <p className="text-xs text-foreground whitespace-pre-wrap">
                        {typeof run.input === "string"
                          ? run.input
                          : typeof (run.input as Record<string, unknown>)?.prompt ===
                              "string"
                            ? String(
                                (run.input as Record<string, unknown>).prompt,
                              )
                            : JSON.stringify(run.input, null, 2)}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Tool Execution Steps */}
                  <div>
                    <h4 className="mb-1.5 font-medium text-foreground">
                      Execution Steps
                    </h4>
                    <ExecutionStepsCard
                      steps={steps}
                      isLive={isInspectedActive}
                    />
                  </div>

                  {/* Output or Error */}
                  {Boolean(run.error) && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                      <div className="font-semibold">Error</div>
                      <div className="mt-1 font-mono text-[11px] whitespace-pre-wrap">
                        {run.error}
                      </div>
                    </div>
                  )}

                  {Boolean(run.output) && (
                    <Card size="sm">
                      <CardHeader className="py-2.5">
                        <CardTitle className="text-xs">
                          Final Response
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2.5">
                        <div className="text-xs text-foreground whitespace-pre-wrap">
                          {typeof run.output === "string"
                            ? run.output
                            : typeof (run.output as Record<string, unknown>)
                                  ?.text === "string"
                              ? String(
                                  (run.output as Record<string, unknown>).text,
                                )
                              : JSON.stringify(run.output, null, 2)}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </ScrollArea>
          ) : (
            // Runs List View
            <ScrollArea className="h-[calc(100vh-140px)] pr-2">
              {isLoadingRuns ? (
                <div className="flex items-center justify-center p-8">
                  <Spinner className="size-5" />
                </div>
              ) : !runsData?.runs?.length ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No runs recorded for this agent yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {runsData.runs.map((r) => {
                    const promptText =
                      typeof r.input === "string"
                        ? r.input
                        : typeof (r.input as Record<string, unknown>)?.prompt ===
                            "string"
                          ? String(
                              (r.input as Record<string, unknown>).prompt,
                            )
                          : "Manual Run";

                    return (
                      <Card
                        key={r.id}
                        size="sm"
                        className="cursor-pointer transition-colors hover:bg-muted/40"
                        onClick={() => setInspectedRunId(r.id)}
                      >
                        <CardContent className="space-y-1.5 p-3">
                          <div className="flex items-center justify-between">
                            {getStatusBadge(r.status)}
                            <span className="text-[10px] text-muted-foreground">
                              {formatTimestamp(r.createdAt)}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-xs font-medium text-foreground">
                            {promptText}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
