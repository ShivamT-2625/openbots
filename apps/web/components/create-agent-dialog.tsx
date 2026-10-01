"use client";

import { Button } from "@openbots/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@openbots/ui/components/dialog";
import { Input } from "@openbots/ui/components/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@openbots/ui/components/native-select";
import { Spinner } from "@openbots/ui/components/spinner";
import { Textarea } from "@openbots/ui/components/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { getClient } from "@/lib/api";

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentCreated: (agentId: string) => void;
}

export function CreateAgentDialog({
  open,
  onOpenChange,
  onAgentCreated,
}: CreateAgentDialogProps) {
  const queryClient = useQueryClient();

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [instructions, setInstructions] = React.useState(
    "You are a helpful assistant. Use tools when helpful to answer questions.",
  );
  const [model, setModel] = React.useState("google/gemini-2.5-flash");
  const [maxSteps, setMaxSteps] = React.useState(10);
  const [autonomy, setAutonomy] = React.useState<"manual">("manual");
  const [error, setError] = React.useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const client = getClient();
      const res = await client.api.agents.$post({
        json: {
          name: name.trim(),
          description: description.trim() || undefined,
          instructions: instructions.trim(),
          model,
          maxSteps: Number(maxSteps) || 10,
          autonomy,
        },
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data?.error || "Failed to create agent");
      }

      return res.json() as Promise<{ agent: { id: string } }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      onOpenChange(false);
      // Reset form
      setName("");
      setDescription("");
      if (data?.agent?.id) {
        onAgentCreated(data.agent.id);
      }
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Agent name is required.");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
            <DialogDescription>
              Configure the identity, instructions, and execution boundaries for
              your agent.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-1.5">
              <label
                htmlFor="name"
                className="text-xs font-medium text-foreground"
              >
                Name *
              </label>
              <Input
                id="name"
                placeholder="e.g. Research Assistant"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="description"
                className="text-xs font-medium text-muted-foreground"
              >
                Description (optional)
              </label>
              <Input
                id="description"
                placeholder="e.g. Researches documentation and executes safe tools"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="instructions"
                className="text-xs font-medium text-foreground"
              >
                System Instructions
              </label>
              <Textarea
                id="instructions"
                rows={4}
                className="font-mono text-xs"
                placeholder="Define your agent's behavior and tool usage directives..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label
                  htmlFor="model"
                  className="text-xs font-medium text-foreground"
                >
                  Model
                </label>
                <NativeSelect
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full"
                >
                  <NativeSelectOption value="google/gemini-2.5-flash">
                    Gemini 2.5 Flash
                  </NativeSelectOption>
                  <NativeSelectOption value="google/gemini-2.5-pro">
                    Gemini 2.5 Pro
                  </NativeSelectOption>
                </NativeSelect>
              </div>

              <div className="grid gap-1.5">
                <label
                  htmlFor="maxSteps"
                  className="text-xs font-medium text-foreground"
                >
                  Max Loop Steps
                </label>
                <Input
                  id="maxSteps"
                  type="number"
                  min={1}
                  max={50}
                  value={maxSteps}
                  onChange={(e) => setMaxSteps(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="autonomy"
                className="text-xs font-medium text-foreground"
              >
                Autonomy Mode
              </label>
              <NativeSelect
                id="autonomy"
                value={autonomy}
                onChange={(e) => setAutonomy(e.target.value as "manual")}
                className="w-full"
              >
                <NativeSelectOption value="manual">
                  Manual (Standard Tool Loop)
                </NativeSelectOption>
              </NativeSelect>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Spinner className="mr-1.5 size-3.5" />
              )}
              Create Agent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
