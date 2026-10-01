"use client";

import { Button } from "@openbots/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@openbots/ui/components/empty";
import { Spinner } from "@openbots/ui/components/spinner";
import { IconPlus, IconRobot } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { AgentHeader } from "@/components/agent-header";
import {
  type AgentData,
  ConfigureAgentSheet,
} from "@/components/configure-agent-sheet";
import {
  ConversationTimeline,
  type MessageItem,
} from "@/components/conversation-timeline";
import { CreateAgentDialog } from "@/components/create-agent-dialog";
import type { StepItem } from "@/components/execution-steps-card";
import { InputComposer } from "@/components/input-composer";
import {
  RunHistorySheet,
  type RunRecord,
} from "@/components/run-history-sheet";
import { getClient } from "@/lib/api";

export default function AgentWorkspacePage() {
  const queryClient = useQueryClient();

  // State
  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(
    null,
  );
  const [activeConversationId, setActiveConversationId] = React.useState<
    string | null
  >(null);
  const [activeRunId, setActiveRunId] = React.useState<string | null>(null);

  // Dialog / Sheet states
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [configureSheetOpen, setConfigureSheetOpen] = React.useState(false);
  const [historySheetOpen, setHistorySheetOpen] = React.useState(false);
  const [inspectedRunId, setInspectedRunId] = React.useState<string | null>(
    null,
  );

  // 1. Fetch Agents List
  const { data: agentsData, isLoading: isLoadingAgents } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const client = getClient();
      const res = await client.api.agents.$get();
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json() as Promise<{ agents: AgentData[] }>;
    },
  });

  const agents = agentsData?.agents || [];

  // Automatically select the first agent if none is selected
  React.useEffect(() => {
    if (agents.length > 0 && !selectedAgentId && agents[0]?.id) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  const selectedAgent = agents.find((ag) => ag.id === selectedAgentId) || null;

  // 2. Fetch Conversations for selected agent
  const { data: conversationsData } = useQuery({
    queryKey: ["conversations", selectedAgentId],
    queryFn: async () => {
      if (!selectedAgentId) return { conversations: [] };
      const client = getClient();
      const res = await client.api.conversations.$get({
        query: { agentId: selectedAgentId },
      });
      if (!res.ok) return { conversations: [] };
      return res.json() as Promise<{ conversations: Array<{ id: string }> }>;
    },
    enabled: !!selectedAgentId,
  });

  // Pick first conversation if available
  React.useEffect(() => {
    if (
      conversationsData?.conversations &&
      conversationsData.conversations.length > 0 &&
      !activeConversationId &&
      conversationsData.conversations[0]?.id
    ) {
      setActiveConversationId(conversationsData.conversations[0].id);
    }
  }, [conversationsData, activeConversationId]);

  // When agent switches, reset active conversation and run
  React.useEffect(() => {
    if (selectedAgentId) {
      setActiveConversationId(null);
      setActiveRunId(null);
    }
  }, [selectedAgentId]);

  // 3. Fetch Messages for active conversation
  const { data: conversationDetail } = useQuery({
    queryKey: ["conversation", activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return { messages: [] };
      const client = getClient();
      const res = await client.api.conversations[":id"].$get({
        param: { id: activeConversationId },
      });
      if (!res.ok) return { messages: [] };
      return res.json() as Promise<{
        conversation: { id: string };
        messages: MessageItem[];
      }>;
    },
    enabled: !!activeConversationId,
  });

  const messages = conversationDetail?.messages || [];

  // 4. Poll Active Run
  const { data: activeRunData } = useQuery({
    queryKey: ["run", activeRunId],
    queryFn: async () => {
      if (!activeRunId) return null;
      const client = getClient();
      const res = await client.api.runs[":id"].$get({
        param: { id: activeRunId },
      });
      if (!res.ok) throw new Error("Failed to fetch active run");
      return res.json() as Promise<{ run: RunRecord; steps: StepItem[] }>;
    },
    enabled: !!activeRunId,
    refetchInterval: (query) => {
      const status = query.state.data?.run?.status;
      // Stop polling on terminal states
      if (status === "queued" || status === "running") {
        return 1500;
      }
      return false;
    },
  });

  // When active run reaches a terminal state, invalidate conversation messages and runs list
  const activeRunStatus = activeRunData?.run?.status;
  React.useEffect(() => {
    if (
      activeRunStatus === "completed" ||
      activeRunStatus === "failed" ||
      activeRunStatus === "cancelled"
    ) {
      if (activeConversationId) {
        queryClient.invalidateQueries({
          queryKey: ["conversation", activeConversationId],
        });
      }
      if (selectedAgentId) {
        queryClient.invalidateQueries({
          queryKey: ["runs", selectedAgentId],
        });
      }
    }
  }, [activeRunStatus, activeConversationId, selectedAgentId, queryClient]);

  // 5. Submit Run Mutation
  const runMutation = useMutation({
    mutationFn: async (prompt: string) => {
      if (!selectedAgentId) throw new Error("No agent selected");
      const client = getClient();
      const res = await client.api.agents[":id"].runs.$post({
        param: { id: selectedAgentId },
        json: {
          prompt,
          conversationId: activeConversationId || undefined,
        },
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data?.error || "Failed to trigger run");
      }

      return res.json() as Promise<{
        run: {
          id: string;
          status: RunRecord["status"];
          conversationId?: string | null;
        };
      }>;
    },
    onSuccess: (data) => {
      if (data.run.conversationId && !activeConversationId) {
        setActiveConversationId(data.run.conversationId);
      }
      setActiveRunId(data.run.id);
      if (selectedAgentId) {
        queryClient.invalidateQueries({
          queryKey: ["runs", selectedAgentId],
        });
        queryClient.invalidateQueries({
          queryKey: ["conversations", selectedAgentId],
        });
      }
    },
  });

  // 6. Cancel Run Mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!activeRunId) return;
      const client = getClient();
      const res = await client.api.runs[":id"].cancel.$post({
        param: { id: activeRunId },
      });
      if (!res.ok) throw new Error("Failed to cancel run");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["run", activeRunId] });
      if (selectedAgentId) {
        queryClient.invalidateQueries({
          queryKey: ["runs", selectedAgentId],
        });
      }
    },
  });

  const isActiveRun =
    activeRunStatus === "queued" || activeRunStatus === "running";

  return (
    <div className="flex h-svh w-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <AgentHeader
        agents={agents}
        selectedAgent={selectedAgent}
        onSelectAgent={(id) => setSelectedAgentId(id)}
        onOpenCreate={() => setCreateDialogOpen(true)}
        onOpenConfigure={() => setConfigureSheetOpen(true)}
        onOpenHistory={() => {
          setInspectedRunId(null);
          setHistorySheetOpen(true);
        }}
      />

      {/* Main Workspace Area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {isLoadingAgents ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        ) : !selectedAgent ? (
          /* Empty State when no agents exist */
          <div className="flex flex-1 items-center justify-center p-6">
            <Empty className="max-w-md border rounded-xl bg-card p-8 shadow-xs">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconRobot className="size-6 text-primary" />
                </EmptyMedia>
                <EmptyTitle>Welcome to OpenBots</EmptyTitle>
                <EmptyDescription>
                  Create your first autonomous agent to begin executing
                  multi-step tasks with tools and live tracking.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="gap-1.5"
                >
                  <IconPlus className="size-4" />
                  Create First Agent
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : (
          /* Conversation & Input Workspace */
          <div className="flex flex-1 flex-col overflow-hidden">
            <ConversationTimeline
              messages={messages}
              activeRun={activeRunData?.run || null}
              activeRunSteps={activeRunData?.steps || []}
              onCancelRun={() => cancelMutation.mutate()}
              isCancelling={cancelMutation.isPending}
              agentName={selectedAgent.name}
            />

            <InputComposer
              onSend={(prompt) => runMutation.mutate(prompt)}
              isSubmitting={runMutation.isPending}
              isActiveRun={isActiveRun}
              onCancelRun={() => cancelMutation.mutate()}
              isCancelling={cancelMutation.isPending}
              placeholder={`Send task to ${selectedAgent.name}...`}
            />
          </div>
        )}
      </main>

      {/* Dialogs and Slide-Over Drawers */}
      <CreateAgentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onAgentCreated={(newId) => {
          setSelectedAgentId(newId);
          setActiveConversationId(null);
          setActiveRunId(null);
        }}
      />

      <ConfigureAgentSheet
        agent={selectedAgent}
        open={configureSheetOpen}
        onOpenChange={setConfigureSheetOpen}
      />

      <RunHistorySheet
        agentId={selectedAgentId}
        open={historySheetOpen}
        onOpenChange={setHistorySheetOpen}
        selectedRunId={inspectedRunId}
        onSelectRunId={setInspectedRunId}
      />
    </div>
  );
}
