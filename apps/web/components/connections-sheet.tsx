"use client"

import { Badge } from "@openbots/ui/components/badge"
import { Button } from "@openbots/ui/components/button"
import { Card, CardContent } from "@openbots/ui/components/card"
import { ScrollArea } from "@openbots/ui/components/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@openbots/ui/components/sheet"
import { Spinner } from "@openbots/ui/components/spinner"
import {
  IconBrandGmail,
  IconBrandNotion,
  IconCheck,
  IconPlug,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as React from "react"
import { getClient } from "@/lib/api"

interface ConnectionsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const AVAILABLE_INTEGRATIONS = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Send emails, draft replies, and query inbox messages.",
    icon: IconBrandGmail,
    provider: "composio",
    accountId: "gmail_connected_account",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Read, write, search, and update databases and docs.",
    icon: IconBrandNotion,
    provider: "composio",
    accountId: "notion_connected_account",
  },
] as const

export function ConnectionsSheet({
  open,
  onOpenChange,
}: ConnectionsSheetProps) {
  const queryClient = useQueryClient()

  const { data: connectionsData, isLoading } = useQuery({
    queryKey: ["connections"],
    queryFn: async () => {
      const client = getClient()
      const res = await client.api.connections.$get()
      if (!res.ok) return { connections: [] }
      return res.json() as Promise<{
        connections: Array<{
          id: string
          provider: string
          externalAccountId: string
          status: string
          createdAt: string
        }>
      }>
    },
    enabled: open,
  })

  const connectMutation = useMutation({
    mutationFn: async ({
      provider,
      externalAccountId,
    }: {
      provider: string
      externalAccountId: string
    }) => {
      const client = getClient()
      const res = await client.api.connections.$post({
        json: {
          provider,
          externalAccountId,
        },
      })
      if (!res.ok) throw new Error("Failed to connect integration")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const client = getClient()
      const res = await client.api.connections[":id"].$delete({
        param: { id },
      })
      if (!res.ok) throw new Error("Failed to disconnect integration")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] })
    },
  })

  const connections = connectionsData?.connections || []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <IconPlug className="size-4" />
            Integrations & Connections
          </SheetTitle>
          <SheetDescription>
            One-click connect your third-party SaaS tools so your autonomous
            agents can take real-world actions.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-hidden px-4">
          <div className="grid gap-3">
            <span className="text-xs font-semibold tracking-tight text-foreground">
              Supported Integrations
            </span>
            <div className="grid gap-2.5">
              {AVAILABLE_INTEGRATIONS.map((integration) => {
                const Icon = integration.icon
                const activeConn = connections.find(
                  (c) =>
                    c.externalAccountId === integration.accountId ||
                    c.provider === integration.id ||
                    c.externalAccountId.toLowerCase().includes(integration.id)
                )
                const isConnected = !!activeConn
                const isPending =
                  (connectMutation.isPending &&
                    connectMutation.variables?.externalAccountId ===
                      integration.accountId) ||
                  (deleteMutation.isPending &&
                    deleteMutation.variables === activeConn?.id)

                return (
                  <Card
                    key={integration.id}
                    size="sm"
                    className="bg-secondary py-1"
                  >
                    <CardContent className="flex items-center justify-between p-2">
                      <div className="flex min-w-0 items-start gap-3 pr-2">
                        <div className="shrink-0 rounded-lg border border-border/80 bg-background p-2 text-foreground">
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-foreground">
                              {integration.name}
                            </span>
                            {isConnected && (
                              <Badge
                                variant="outline"
                                className="h-4 border-emerald-500/20 bg-emerald-500/10 py-0 text-[10px] text-emerald-600 dark:text-emerald-400"
                              >
                                Connected
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] leading-snug text-muted-foreground">
                            {integration.description}
                          </p>
                        </div>
                      </div>

                      {isConnected ? (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(activeConn.id)}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Spinner className="size-3" />
                          ) : (
                            <IconTrash className="size-3" />
                          )}
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          size="xs"
                          variant="default"
                          className="shrink-0 gap-1 text-xs"
                          onClick={() =>
                            connectMutation.mutate({
                              provider: integration.provider,
                              externalAccountId: integration.accountId,
                            })
                          }
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Spinner className="size-3" />
                          ) : (
                            <IconPlus className="size-3" />
                          )}
                          Connect
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          <div className="flex flex-1 flex-col space-y-2 overflow-hidden pt-2">
            <span className="text-xs font-medium text-muted-foreground">
              Active Connected Accounts ({connections.length})
            </span>
            <ScrollArea className="flex-1 pr-2">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Spinner className="size-5" />
                </div>
              ) : connections.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                  No active connections yet. Click Connect on Gmail or Notion
                  above to activate tools for your agents.
                </div>
              ) : (
                <div className="space-y-2">
                  {connections.map((c) => (
                    <Card key={c.id} size="sm" className="bg-card">
                      <CardContent className="flex items-center justify-between p-3">
                        <div className="min-w-0 space-y-0.5 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold tracking-wider text-foreground uppercase">
                              {c.provider}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] text-emerald-600 dark:text-emerald-400"
                            >
                              {c.status}
                            </Badge>
                          </div>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {c.externalAccountId}
                          </p>
                        </div>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="size-7 shrink-0 text-destructive hover:bg-destructive/10"
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

        <SheetFooter className="flex border-t border-border/60 bg-background/80 p-3 sm:justify-end">
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
