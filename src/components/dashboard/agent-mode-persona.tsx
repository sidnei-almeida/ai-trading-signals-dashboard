"use client";

import { AgentPersonaIcon } from "@/components/dashboard/agent-persona-icons";
import { getAgentPersona } from "@/lib/agent-persona";
import { useDashboardStore } from "@/store/dashboard-store";
import type { StrategyMode } from "@/types/rl-trading";
import { cn } from "@/lib/utils";

export function AgentModePersona({
  mode: modeProp,
  variant = "default",
  className,
}: {
  mode?: StrategyMode;
  variant?: "default" | "compact";
  className?: string;
}) {
  const storeMode = useDashboardStore((s) => s.strategyMode);
  const mode = modeProp ?? storeMode;
  const persona = getAgentPersona(mode);

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border px-2 py-1.5",
          persona.ring,
          persona.surface,
          className,
        )}
      >
        <AgentPersonaIcon mode={mode} className={cn("size-6", persona.accent)} />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            Agent Mode
          </p>
          <p className={cn("text-xs font-medium leading-tight", persona.accent)}>
            {persona.label}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-2.5 py-2",
        persona.ring,
        persona.surface,
        className,
      )}
    >
      <AgentPersonaIcon mode={mode} className={persona.accent} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">
          Agent Mode
        </p>
        <p className={cn("mt-0.5 text-sm font-medium leading-tight", persona.accent)}>
          {persona.label}
        </p>
        <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">
          {persona.posture}
        </p>
      </div>
    </div>
  );
}
