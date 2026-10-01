"use client";

import { Avatar, AvatarFallback } from "@openbots/ui/components/avatar";
import { Blobatar } from "@openbots/ui/components/ui/blobatar";
import { Button } from "@openbots/ui/components/button";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@openbots/ui/components/sidebar";
import {
  IconLogout,
  IconPlus,
  IconRobot,
  IconSearch,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import type { AgentData } from "@/components/configure-agent-sheet";
import { signOut, useSession } from "@/lib/auth-client";

interface WorkspaceSidebarProps {
  agents: AgentData[];
  onOpenCreate: () => void;
}

export function WorkspaceSidebar({
  agents,
  onOpenCreate,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [search, setSearch] = React.useState("");

  const filteredAgents = React.useMemo(() => {
    if (!search.trim()) return agents;
    const query = search.toLowerCase();
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        (a.description && a.description.toLowerCase().includes(query)),
    );
  }, [agents, search]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  const userInitials = React.useMemo(() => {
    const name = session?.user?.name || session?.user?.email || "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [session]);

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-3 border-b border-sidebar-border/60">
        <div className="flex items-center justify-between mb-3 px-1">
          <Link
            href="/"
            className="flex items-center gap-2 font-mono text-sm font-bold text-sidebar-foreground"
          >
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
              <IconRobot className="size-4" />
            </div>
            <span>OpenBots</span>
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1"
            onClick={onOpenCreate}
          >
            <IconPlus className="size-3.5" />
            <span>New</span>
          </Button>
        </div>

        <div className="relative">
          <IconSearch className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
          <SidebarInput
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-sidebar-accent/40"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            {filteredAgents.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                {search
                  ? "No agents match your search"
                  : "No agents created yet"}
              </div>
            ) : (
              <SidebarMenu>
                {filteredAgents.map((ag) => {
                  const isActive = pathname === `/agent/${ag.id}`;
                  return (
                    <SidebarMenuItem key={ag.id}>
                      <SidebarMenuButton
                        render={<Link href={`/agent/${ag.id}`} />}
                        isActive={isActive}
                        className="h-10 px-2.5 py-1.5 transition-colors"
                      >
                        <div className="flex items-center justify-between w-full gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Blobatar
                              name={ag.name || ag.id}
                              className="size-6 shrink-0"
                            />
                            <div className="flex flex-col min-w-0 pr-1">
                              <span className="truncate text-xs font-medium text-sidebar-foreground">
                                {ag.name}
                              </span>
                              <span className="truncate text-[10px] text-muted-foreground">
                                {ag.model.replace("google/", "")}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`size-2 shrink-0 rounded-full ${
                              ag.status === "active"
                                ? "bg-emerald-500"
                                : "bg-muted-foreground/40"
                            }`}
                          />
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border/60">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="size-7 bg-muted text-foreground text-xs font-semibold">
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate text-sidebar-foreground">
                {session?.user?.name || "User"}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {session?.user?.email}
              </span>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
            title="Sign out"
          >
            <IconLogout className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
