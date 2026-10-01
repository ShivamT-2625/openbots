"use client"

import { Avatar, AvatarFallback } from "@openbots/ui/components/avatar"
import { Blobatar } from "@openbots/ui/components/ui/blobatar"
import { Button } from "@openbots/ui/components/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@openbots/ui/components/sidebar"
import {
  IconLogout,
  IconPlus,
  IconRobot,
  IconSearch,
} from "@tabler/icons-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"
import type { AgentData } from "@/components/configure-agent-sheet"
import { signOut, useSession } from "@/lib/auth-client"
import { cn } from "@openbots/ui/lib/utils"

interface WorkspaceSidebarProps {
  agents: AgentData[]
  onOpenCreate: () => void
}

export function WorkspaceSidebar({
  agents,
  onOpenCreate,
}: WorkspaceSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [search, setSearch] = React.useState("")

  const filteredAgents = React.useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return agents

    return agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(query) ||
        agent.description?.toLowerCase().includes(query)
    )
  }, [agents, search])

  const handleSignOut = async () => {
    await signOut()
    router.replace("/login")
  }

  const userInitials = React.useMemo(() => {
    const name = session?.user?.name || session?.user?.email || "U"

    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }, [session])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="group">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
                <IconRobot className="size-4" />
              </span>

              <span className="font-mono text-sm font-bold">OpenBots</span>

              <SidebarTrigger className="ml-auto size-7 opacity-0 transition-opacity group-hover:opacity-100" />
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Button />}
              tooltip="New agent"
              onClick={onOpenCreate}
            >
              <IconPlus />
              <span className="group-data-[collapsible=icon]:hidden">
                New agent
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarInput
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 bg-sidebar-accent/40 text-xs"
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {filteredAgents.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                {search
                  ? "No agents match your search"
                  : "No agents created yet"}
              </p>
            ) : (
              <SidebarMenu>
                {filteredAgents.map((agent) => {
                  const isActive = pathname === `/agent/${agent.id}`

                  return (
                    <SidebarMenuItem key={agent.id}>
                      <SidebarMenuButton
                        render={<Link href={`/agent/${agent.id}`} />}
                        isActive={isActive}
                        tooltip={agent.name}
                        className="h-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0!"
                      >
                        <Blobatar
                          name={agent.name || agent.id}
                          className="size-7 shrink-0"
                        />

                        <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                          <span className="block truncate text-xs font-medium">
                            {agent.name}
                          </span>

                          <span className="block truncate text-[10px] text-muted-foreground">
                            {agent.description}
                          </span>
                        </span>

                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full group-data-[collapsible=icon]:hidden",
                            agent.status === "active"
                              ? "bg-emerald-500"
                              : "bg-muted-foreground/40"
                          )}
                        />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={session?.user?.name || "User"}
            >
              <Avatar className="size-7 shrink-0">
                <AvatarFallback className="text-xs font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">
                  {session?.user?.name || "User"}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {session?.user?.email}
                </span>
              </span>

              <Button
                size="icon"
                variant="ghost"
                className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
                title="Sign out"
              >
                <IconLogout className="size-4" />
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
