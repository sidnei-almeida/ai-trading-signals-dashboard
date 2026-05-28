"use client";

import { getOperatingModeConfig, STRATEGY_MODE_ORDER } from "@/lib/operating-modes";
import { useDashboardStore } from "@/store/dashboard-store";
import type { StrategyMode } from "@/types/rl-trading";
import { cn } from "@/lib/utils";

export function StrategyModeControl() {
  const { strategyMode, setStrategyMode, addActivity } = useDashboardStore();

  const onSelect = (mode: StrategyMode) => {
    if (mode === strategyMode) return;
    setStrategyMode(mode);
    const label = getOperatingModeConfig(mode).label;
    addActivity({
      id: crypto.randomUUID(),
      time: new Date().toISOString(),
      source: "Operator",
      symbol: "PORTFOLIO",
      event: `Operating mode changed to ${label}`,
      signal: "—",
      confidence: null,
      riskCheck: "Applied",
      action: "MODE_CHANGE",
      status: "simulated",
    });
  };

  return (
    <div className="mode-group" role="group" aria-label="Operating mode">
      {STRATEGY_MODE_ORDER.map((mode) => {
        const active = strategyMode === mode;
        const label = getOperatingModeConfig(mode).label;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onSelect(mode)}
            className={cn("mode-btn", active && "active")}
            aria-pressed={active}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
