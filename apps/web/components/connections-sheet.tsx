"use client";

import { Badge } from "@openbots/ui/components/badge";
import { Button } from "@openbots/ui/components/button";
import { Card, CardContent } from "@openbots/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@openbots/ui/components/field";
import { Input } from "@openbots/ui/components/input";
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
import { IconPlug, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { getClient } from "@/lib/api";

interface ConnectionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectionsSheet({
  open,
  onOpenChange,
}: ConnectionsSheetProps) {
  const queryClient = useQueryClient();
  const [provider, setProvider] = React.useState("composio");
  const [externalAccountId, setExternalAccountId] = React.useState("");

  const { data: connectionsData, isLoading } = useQuery({
    queryKey: ["connections"],
    queryFn: async () => {
      const client = getClient();
      const res = await client.api.connections.$get();
      if (!res.ok) return { connections: [] };
      return res.json() as Promise<{
        connections: Array<{
          id: string;
          provider: string;
          externalAccountId: string;
          status: string;
          createdAt: string;
        }>;
      }>;
    },
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!externalAccountId.trim()) return;
      const client = getClient();
      const res = await client.api.connections.$post({
        json: {
          provider,
          externalAccountId: externalAccountId.trim(),
        },
      });
      if (!res.ok) throw new Error("Failed to add connection");
      return res.json();
    },
    onSuccess: () => {
      setExternalAccountId("");
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const client = getClient();
      const res = await client.api.connections[":id"].$delete({
        param: { id },
      });
      if (!res.ok) throw new Error("Failed to delete connection");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    },
  });

  const connections = connectionsData?.connections || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <IconPlug className="size-4" />
            Connected Integrations
          </SheetTitle>
          <SheetDescription>
            Manage authenticated third-party SaaS integrations (Composio,
            GitHub, Slack) available to your agents.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 py-3 flex-1 overflow-hidden">
          <form
            id="add-connection-form"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="rounded-lg border border-border/70 p-3 bg-muted/20 space-y-3 shrink-0"
          >
            <span className="text-xs font-semibold text-foreground">
              Add Integration Connection
            </span>
            <FieldGroup className="gap-2">
              <Field>
                <FieldLabel htmlFor="conn-provider">Provider</FieldLabel>
                <Input
                  id="conn-provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  placeholder="composio / github / slack"
                  className="h-8 text-xs"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="conn-acc">Account / Session ID</FieldLabel>
                <Input
                  id="conn-acc"
                  value={externalAccountId}
                  onChange={(e) => setExternalAccountId(e.target.value)}
                  placeholder="e.g. session_123 or user_account_id"
                  className="h-8 text-xs"
                  required
                />
              </Field>
            </FieldGroup>
          </form>

          <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">
              Active Connections ({connections.length})
            </span>
            <ScrollArea className="flex-1 pr-2">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Spinner className="size-5" />
                </div>
              ) : connections.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                  No active connections found. Add one above to link external
                  accounts.
                </div>
              ) : (
                <div className="space-y-2">
                  {connections.map((c) => (
                    <Card key={c.id} size="sm" className="bg-card">
                      <CardContent className="flex items-center justify-between p-3">
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                              {c.provider}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] text-emerald-600 dark:text-emerald-400"
                            >
                              {c.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] font-mono text-muted-foreground truncate">
                            {c.externalAccountId}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => deleteMutation.mutate(c.id)}
                          disabled={deleteMutation.isPending}
                          title="Disconnect"
                        >
                          <IconTrash className="size-3.5" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <SheetFooter className="border-t border-border/60 bg-background/80 p-3">
          <Button
            type="submit"
            form="add-connection-form"
            size="sm"
            className="w-full h-8 text-xs gap-1.5"
            disabled={createMutation.isPending || !externalAccountId.trim()}
          >
            {createMutation.isPending ? (
              <Spinner className="size-3.5" />
            ) : (
              <IconPlus className="size-3.5" />
            )}
            Save Connection
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
