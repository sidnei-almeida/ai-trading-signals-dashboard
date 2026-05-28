"use client";

import { AgentModePersona } from "@/components/dashboard/agent-mode-persona";
import { Panel } from "@/components/dashboard/panel";
import { SpecLine } from "@/components/settings/settings-form";
import {
  getOperatingModeConfig,
  STRATEGY_MODE_ORDER,
} from "@/lib/operating-modes";
import { useDashboardStore } from "@/store/dashboard-store";
import type { StrategyMode } from "@/types/rl-trading";
import { cn } from "@/lib/utils";

export function SettingsOperatingModeCard({
  onModeChange,
}: {
  onModeChange: (mode: StrategyMode) => void;
}) {
  const strategyMode = useDashboardStore((s) => s.strategyMode);
  const active = getOperatingModeConfig(strategyMode);

  return (
    <Panel
      title="Operating Mode"
      subtitle="Risk profile · mode-adjusted PPO targets"
      className="h-full"
      bodyClassName="flex h-full min-h-0 flex-col gap-3 p-3"
    >
      <AgentModePersona mode={strategyMode} className="shrink-0" />
      <div className="grid gap-1.5 sm:grid-cols-3">
        {STRATEGY_MODE_ORDER.map((mode) => {
          const cfg = getOperatingModeConfig(mode);
          const selected = strategyMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onModeChange(mode)}
              className={cn(
                "rounded-md border px-2.5 py-2 text-left transition-colors",
                selected
                  ? "border-amber-500/40 bg-amber-950/25"
                  : "border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700",
              )}
            >
              <p className="text-[11px] font-medium text-zinc-200">{cfg.label}</p>
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-zinc-500">
                {cfg.description}
              </p>
            </button>
          );
        })}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-zinc-800/70 pt-2.5">
        <SpecLine
          label="Rebalance intensity"
          value={`${(active.rebalanceIntensity * 100).toFixed(0)}%`}
        />
        <SpecLine
          label="Max single asset"
          value={`${(active.maxSingleAssetAllocation * 100).toFixed(0)}%`}
        />
        <SpecLine
          label="Max rebalance step"
          value={`${(active.maxRebalanceStep * 100).toFixed(0)}%`}
        />
        <SpecLine label="Cash reserve" value={`${(active.cashReservePct * 100).toFixed(0)}%`} />
        <SpecLine label="Risk multiplier" value={`${active.riskMultiplier}×`} />
      </div>
    </Panel>
  );
}
