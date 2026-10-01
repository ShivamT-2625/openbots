"use client";

import { Badge } from "@openbots/ui/components/badge";
import { Button } from "@openbots/ui/components/button";
import { Card, CardContent } from "@openbots/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@openbots/ui/components/field";
import { Input } from "@openbots/ui/components/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@openbots/ui/components/native-select";
import { ScrollArea } from "@openbots/ui/components/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@openbots/ui/components/sheet";

import { Spinner } from "@openbots/ui/components/spinner";
import { Switch } from "@openbots/ui/components/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@openbots/ui/components/tabs";
import { Textarea } from "@openbots/ui/components/textarea";
import { IconCheck, IconSettings } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { getClient } from "@/lib/api";

export type AgentData = {
  id: string;
  name: string;
  description: string | null;
  instructions: string;
  model: string;
  maxSteps: number;
  autonomy: string;
  status: string;
};

export type AgentToolItem = {
  id: string;
  agentId: string;
  toolName: string;
  provider: "internal" | "composio" | "mcp";
  enabled: boolean;
  config: unknown;
};

interface ConfigureAgentSheetProps {
  agent: AgentData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigureAgentSheet({
  agent,
  open,
  onOpenChange,
}: ConfigureAgentSheetProps) {
  const queryClient = useQueryClient();

  // Form states
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [instructions, setInstructions] = React.useState("");
  const [model, setModel] = React.useState("google/gemini-2.5-flash");
  const [maxSteps, setMaxSteps] = React.useState(10);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Sync state with agent prop
  React.useEffect(() => {
    if (agent) {
      setName(agent.name);
      setDescription(agent.description || "");
      setInstructions(agent.instructions);
      setModel(agent.model);
      setMaxSteps(agent.maxSteps || 10);
      setSaveSuccess(false);
      setSaveError(null);
    }
  }, [agent]);

  // Query available live models
  const { data: modelsData } = useQuery({
    queryKey: ["available-models"],
    queryFn: async () => {
      const client = getClient();
      const res = await client.api.agents.models.$get();
      if (!res.ok) return { models: [] };
      return res.json() as Promise<{
        models: Array<{
          id: string;
          displayName: string;
          description?: string;
        }>;
      }>;
    },
    enabled: open,
  });

  const availableModels = modelsData?.models || [];

  // Query agent tools
  const { data: toolsData, isLoading: isLoadingTools } = useQuery({
    queryKey: ["agent-tools", agent?.id],
    queryFn: async () => {
      if (!agent?.id) return { tools: [] };
      const client = getClient();
      const res = await client.api.agents[":id"].tools.$get({
        param: { id: agent.id },
      });
      if (!res.ok) throw new Error("Failed to fetch tools");
      return res.json() as Promise<{ tools: AgentToolItem[] }>;
    },
    enabled: open && !!agent?.id,
  });

  // Update agent mutation
  const updateAgentMutation = useMutation({
    mutationFn: async () => {
      if (!agent?.id) return;
      setSaveError(null);
      setSaveSuccess(false);

      const client = getClient();
      const res = await client.api.agents[":id"].$patch({
        param: { id: agent.id },
        json: {
          name: name.trim(),
          description: description.trim() || undefined,
          instructions: instructions.trim(),
          model,
          maxSteps: Number(maxSteps) || 10,
        },
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data?.error || "Failed to update agent");
      }

      return res.json();
    },
    onSuccess: () => {
      setSaveSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent", agent?.id] });
      setTimeout(() => setSaveSuccess(false), 2500);
    },
    onError: (err: Error) => {
      setSaveError(err.message);
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async () => {
      if (!agent?.id) return;
      const client = getClient();
      const res = await client.api.agents[":id"].$delete({
        param: { id: agent.id },
      });
      if (!res.ok) throw new Error("Failed to delete agent");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      onOpenChange(false);
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    },
    onError: (err: Error) => {
      setSaveError(err.message);
    },
  });

  // Toggle tool mutation
  const toggleToolMutation = useMutation({
    mutationFn: async ({
      toolName,
      provider,
      enabled,
    }: {
      toolName: string;
      provider: "internal" | "composio" | "mcp";
      enabled: boolean;
    }) => {
      if (!agent?.id) return;
      const client = getClient();
      const res = await client.api.agents[":id"].tools.$post({
        param: { id: agent.id },
        json: {
          toolName,
          provider,
          enabled,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to update tool");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-tools", agent?.id] });
    },
  });

  if (!agent) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <IconSettings className="size-4" />
            Configure Agent
          </SheetTitle>
          <SheetDescription>
            Adjust instructions, model loop limits, and manage enabled tools.
          </SheetDescription>
        </SheetHeader>

        <Tabs
          defaultValue="general"
          className="flex flex-1 flex-col overflow-hidden px-3"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Configuration</TabsTrigger>
            <TabsTrigger value="tools">
              Tools{" "}
              {toolsData?.tools?.length ? `(${toolsData.tools.length})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="flex-1 overflow-y-auto px-2">
            <form
              id="configure-agent-form"
              onSubmit={(e) => {
                e.preventDefault();
                updateAgentMutation.mutate();
              }}
              className="space-y-4 pr-1"
            >
              {saveSuccess && (
                <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
                  <IconCheck className="size-3.5" />
                  Configuration saved successfully!
                </div>
              )}

              {saveError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {saveError}
                </div>
              )}

              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="cfg-name">Agent Name</FieldLabel>
                  <Input
                    id="cfg-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="cfg-desc">Description</FieldLabel>
                  <Input
                    id="cfg-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="cfg-instructions">
                    System Instructions
                  </FieldLabel>
                  <Textarea
                    id="cfg-instructions"
                    rows={6}
                    className="font-mono text-xs"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    required
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="cfg-model">Model</FieldLabel>
                    <NativeSelect
                      id="cfg-model"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full text-xs"
                    >
                      {availableModels.length > 0 ? (
                        availableModels.map((m) => (
                          <NativeSelectOption key={m.id} value={m.id}>
                            {m.displayName}
                          </NativeSelectOption>
                        ))
                      ) : (
                        <>
                          <NativeSelectOption value="google/gemini-2.5-flash">
                            Gemini 2.5 Flash
                          </NativeSelectOption>
                          <NativeSelectOption value="google/gemini-2.5-pro">
                            Gemini 2.5 Pro
                          </NativeSelectOption>
                          <NativeSelectOption value="google/gemini-2.0-flash">
                            Gemini 2.0 Flash
                          </NativeSelectOption>
                        </>
                      )}
                    </NativeSelect>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="cfg-steps">Max Steps</FieldLabel>
                    <Input
                      id="cfg-steps"
                      type="number"
                      min={1}
                      max={50}
                      value={maxSteps}
                      onChange={(e) => setMaxSteps(Number(e.target.value))}
                    />
                  </Field>
                </div>
              </FieldGroup>
            </form>
          </TabsContent>

          <TabsContent value="tools" className="flex-1 overflow-hidden pt-3">
            <ScrollArea className="h-[calc(100vh-230px)] pr-2">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Toggle the tools available to this agent during its multi-step
                  execution loop.
                </p>

                {isLoadingTools ? (
                  <div className="flex items-center justify-center p-8">
                    <Spinner className="size-5" />
                  </div>
                ) : (
                  toolsData?.tools?.map((tool) => (
                    <Card key={tool.id} size="sm" className="bg-card/70">
                      <CardContent className="flex items-center justify-between p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {tool.toolName}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {tool.provider}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {tool.toolName === "get_current_time" &&
                              "Provides real-time timestamp and timezone calculations."}
                            {tool.toolName === "calculate" &&
                              "Evaluates mathematical expressions safely."}
                            {tool.toolName !== "get_current_time" &&
                              tool.toolName !== "calculate" &&
                              `External ${tool.provider} tool integration.`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={tool.enabled}
                            onCheckedChange={(checked) => {
                              toggleToolMutation.mutate({
                                toolName: tool.toolName,
                                provider: tool.provider,
                                enabled: checked,
                              });
                            }}
                            disabled={toggleToolMutation.isPending}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <SheetFooter className="border-t border-border/60 bg-background/80 p-3 flex flex-col gap-2">
          <Button
            type="submit"
            form="configure-agent-form"
            className="w-full h-8 text-xs"
            disabled={updateAgentMutation.isPending}
          >
            {updateAgentMutation.isPending && (
              <Spinner data-icon="inline-start" />
            )}
            Save Changes
          </Button>

          <Button
            type="button"
            variant="destructive"
            className="w-full h-8 text-xs"
            disabled={deleteAgentMutation.isPending}
            onClick={() => {
              if (
                window.confirm(
                  `Are you sure you want to delete "${agent.name}"? This cannot be undone.`,
                )
              ) {
                deleteAgentMutation.mutate();
              }
            }}
          >
            {deleteAgentMutation.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              "Delete Agent"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
