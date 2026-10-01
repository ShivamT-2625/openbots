"use client";

import { Badge } from "@openbots/ui/components/badge";
import { Button } from "@openbots/ui/components/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@openbots/ui/components/native-select";
import { Separator } from "@openbots/ui/components/separator";
import {
  IconHistory,
  IconPlus,
  IconRobot,
  IconSettings,
} from "@tabler/icons-react";
import type { AgentData } from "./configure-agent-sheet";

interface AgentHeaderProps {
  agents: AgentData[];
  selectedAgent: AgentData | null;
  onSelectAgent: (agentId: string) => void;
  onOpenCreate: () => void;
  onOpenConfigure: () => void;
  onOpenHistory: () => void;
}

export function AgentHeader({
  agents,
  selectedAgent,
  onSelectAgent,
  onOpenCreate,
  onOpenConfigure,
  onOpenHistory,
}: AgentHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-xs">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-mono text-sm font-bold tracking-tight text-foreground">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
            <IconRobot className="size-4" />
          </div>
          <span>OpenBots</span>
        </div>

        <Separator orientation="vertical" className="h-4" />

        {/* Agent Selector */}
        <div className="flex items-center gap-2">
          {agents.length > 0 ? (
            <NativeSelect
              value={selectedAgent?.id || ""}
              onChange={(e) => onSelectAgent(e.target.value)}
              className="font-medium text-xs sm:text-sm"
              size="sm"
            >
              {agents.map((ag) => (
                <NativeSelectOption key={ag.id} value={ag.id}>
                  {ag.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : (
            <span className="text-xs text-muted-foreground">No agents</span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCreate}
            className="text-xs"
          >
            <IconPlus data-icon="inline-start" />
            <span className="hidden sm:inline">New Agent</span>
          </Button>
        </div>

        {/* Agent Metadata Badges */}
        {selectedAgent && (
          <div className="hidden items-center gap-1.5 md:flex">
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
        )}
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2">
        {selectedAgent && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenHistory}
              className="text-xs"
            >
              <IconHistory data-icon="inline-start" />
              <span>Runs</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onOpenConfigure}
              className="text-xs"
            >
              <IconSettings data-icon="inline-start" />
              <span className="hidden sm:inline">Configure</span>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
