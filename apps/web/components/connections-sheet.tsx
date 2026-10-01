"use client"

import { Badge } from "@openbots/ui/components/badge"
import { Button } from "@openbots/ui/components/button"
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

type Connection = {
  id: string
  provider: string
  externalAccountId: string
  status: string
  createdAt: string
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

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 120_000

export function ConnectionsSheet({
  open,
  onOpenChange,
}: ConnectionsSheetProps) {
  const queryClient = useQueryClient()
  const [pollingEnabled, setPollingEnabled] = React.useState(false)
  const baselineCount = React.useRef(0)
  const pollTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: connectionsData, isLoading } = useQuery({
    queryKey: ["connections"],
    queryFn: async () => {
      const client = getClient()
      const res = await client.api.connections.$get()
      if (!res.ok) return { connections: [] }
      return res.json() as Promise<{ connections: Connection[] }>
    },
    enabled: open,
    refetchInterval: pollingEnabled ? POLL_INTERVAL_MS : false,
  })

  const connections = connectionsData?.connections || []

  // Stop polling once a new connection shows up after the OAuth flow.
  React.useEffect(() => {
    if (pollingEnabled && connections.length > baselineCount.current) {
      setPollingEnabled(false)
      if (pollTimeout.current) clearTimeout(pollTimeout.current)
    }
  }, [connections.length, pollingEnabled])

  // Clean up the timeout on unmount.
  React.useEffect(() => {
    return () => {
      if (pollTimeout.current) clearTimeout(pollTimeout.current)
    }
  }, [])

  const connectMutation = useMutation({
    mutationFn: async ({ appName }: { appName: string }) => {
      const client = getClient()
      const res = await client.api.connections.initiate.$post({
        json: { appName },
      })
      if (!res.ok) throw new Error("Failed to initiate connection")
      return res.json() as Promise<{ redirectUrl: string }>
    },
    onSuccess: (data) => {
      if (data.redirectUrl) {
        baselineCount.current = connections.length
        window.open(data.redirectUrl, "_blank", "noopener,noreferrer")
        setPollingEnabled(true)
        if (pollTimeout.current) clearTimeout(pollTimeout.current)
        pollTimeout.current = setTimeout(
          () => setPollingEnabled(false),
          POLL_TIMEOUT_MS
        )
      }
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <IconPlug className="size-4" />
            Integrations & Connections
          </SheetTitle>
          <SheetDescription>
            Connect your tools so your agents can take real actions on your
            behalf.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-hidden px-4">
          {/* Integrations */}
          <section className="grid gap-2">
            <h3 className="text-xs font-medium text-muted-foreground">
              Integrations
            </h3>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {AVAILABLE_INTEGRATIONS.map((integration) => {
                const Icon = integration.icon
                const activeConn = connections.find(
                  (c) =>
                    c.externalAccountId === integration.accountId ||
                    c.provider === integration.id ||
                    c.externalAccountId.toLowerCase().includes(integration.id)
                )
                const isConnected = !!activeConn
                const isWaitingForAuth =
                  pollingEnabled &&
                  !isConnected &&
                  connectMutation.variables?.appName === integration.id
                const isPending =
                  (connectMutation.isPending &&
                    connectMutation.variables?.appName === integration.id) ||
                  isWaitingForAuth ||
                  (deleteMutation.isPending &&
                    deleteMutation.variables === activeConn?.id)

                return (
                  <div
                    key={integration.id}
                    className="flex items-center gap-3 px-3.5 py-3"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                      <Icon className="size-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {integration.name}
                        </span>
                        {isConnected && (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Connected
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                        {isWaitingForAuth
                          ? "Finish signing in in the new tab…"
                          : integration.description}
                      </p>
                    </div>

                    {isConnected ? (
                      <Button
                        size="xs"
                        variant="outline"
                        className="shrink-0 gap-1 text-xs"
                        onClick={() => deleteMutation.mutate(activeConn.id)}
                        disabled={isPending}
                      >
                        {isPending && <Spinner className="size-3" />}
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        size="xs"
                        className="shrink-0 gap-1 text-xs"
                        onClick={() =>
                          connectMutation.mutate({ appName: integration.id })
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
                  </div>
                )
              })}
            </div>
          </section>

          {/* Connected accounts */}
          <section className="flex min-h-0 flex-1 flex-col gap-2">
            <h3 className="text-xs font-medium text-muted-foreground">
              Connected accounts ({connections.length})
            </h3>
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Spinner className="size-5" />
                </div>
              ) : connections.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                  Nothing connected yet. Connect Gmail or Notion above to give
                  your agents access.
                </div>
              ) : (
                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {connections.map((c) => {
                    const rowPending =
                      deleteMutation.isPending &&
                      deleteMutation.variables === c.id
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 px-3.5 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground capitalize">
                              {c.provider}
                            </span>
                            <Badge
                              variant="outline"
                              className="h-4 border-emerald-500/20 bg-emerald-500/10 py-0 text-[10px] text-emerald-600 dark:text-emerald-400"
                            >
                              {c.status}
                            </Badge>
                          </div>
                          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                            {c.externalAccountId}
                          </p>
                        </div>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="size-7 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => deleteMutation.mutate(c.id)}
                          disabled={rowPending}
                          title="Disconnect"
                        >
                          {rowPending ? (
                            <Spinner className="size-3.5" />
                          ) : (
                            <IconTrash className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </section>
        </div>

        <SheetFooter className="border-t border-border p-3">
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
