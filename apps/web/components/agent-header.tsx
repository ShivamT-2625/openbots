"use client"

import { Badge } from "@openbots/ui/components/badge"
import { Blobatar } from "@openbots/ui/components/ui/blobatar"
import { Button } from "@openbots/ui/components/button"

import { SidebarTrigger } from "@openbots/ui/components/sidebar"
import {
  IconCalendar,
  IconHistory,
  IconPlug,
  IconSettings,
} from "@tabler/icons-react"
import type { AgentData } from "./configure-agent-sheet"

interface AgentHeaderProps {
  selectedAgent: AgentData | null
  onOpenConfigure: () => void
  onOpenHistory: () => void
  onOpenConnections?: () => void
  onOpenSchedules?: () => void
}

export function AgentHeader({
  selectedAgent,
  onOpenConfigure,
  onOpenHistory,
  onOpenConnections,
  onOpenSchedules,
}: AgentHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex w-full shrink-0 items-center justify-between border-b border-border bg-background/50 p-2 backdrop-blur-xs">
      <div className="flex items-center gap-3">
        {selectedAgent ? (
          <div className="flex items-center gap-2">
            <Blobatar
              name={selectedAgent.name || selectedAgent.id}
              className="size-7 shrink-0"
            />
            <span className="text-sm font-semibold text-foreground">
              {selectedAgent.name}
            </span>
            <div className="hidden items-center gap-1.5">
              <Badge variant="secondary" className="font-mono text-[10px]">
                {selectedAgent.model.replace("google/", "")}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {selectedAgent.autonomy}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {selectedAgent.maxSteps} steps
              </Badge>
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            No agent selected
          </span>
        )}
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {selectedAgent && (
          <>
            {onOpenConnections && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenConnections}
                className="h-6 gap-1.5 text-xs"
                title="Integrations & Tools"
              >
                <IconPlug className="size-3.5" />
                <span className="hidden md:inline">Connections</span>
              </Button>
            )}

            {onOpenSchedules && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenSchedules}
                className="h-6 gap-1.5 text-xs"
                title="Scheduled Autonomous Tasks"
              >
                <IconCalendar className="size-3.5" />
                <span className="hidden md:inline">Schedules</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onOpenHistory}
              className="h-6 gap-1.5 text-xs"
              title="Execution History"
            >
              <IconHistory className="size-3.5" />
              <span>Runs</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onOpenConfigure}
              className="h-6 gap-1.5 text-xs"
              title="Agent Settings"
            >
              <IconSettings className="size-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
