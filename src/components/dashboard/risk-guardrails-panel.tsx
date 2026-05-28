"use client";

import { AgentModePersona } from "@/components/dashboard/agent-mode-persona";
import { useResolvedTargets } from "@/hooks/use-resolved-targets";
import { Panel } from "@/components/dashboard/panel";
import { buildRebalanceQueue, riskUtilization } from "@/lib/dashboard-math";
import { formatAllocation, formatPercentPlain } from "@/lib/format";
import { useDashboardStore } from "@/store/dashboard-store";
import { Badge } from "@/components/ui/badge";

export function RiskGuardrailsPanel() {
  const { dashboard, strategyMode } = useDashboardStore();
  const data = dashboard?.data;
  const resolved = useResolvedTargets();

  if (!data || !resolved) {
    return (
      <Panel title="Risk Guardrails" className="h-full min-h-[240px]">
        Loading…
      </Panel>
    );
  }

  const queue = buildRebalanceQueue(
    data.current_allocation,
    resolved.adjustedTargets,
    resolved.guardrails,
    resolved.ppoTargets,
  );
  const blocked = queue.filter((q) => q.status === "blocked").length;
  const risk = riskUtilization(
    data.current_allocation,
    resolved.guardrails,
    resolved.modeConfig.riskMultiplier,
  );

  return (
    <Panel
      title="Risk Guardrails"
      subtitle="Exposure limits · paper trading"
      className="h-full min-h-[240px]"
      bodyClassName="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-emerald-500/30 text-[10px] text-emerald-400">
          Paper Trading
        </Badge>
        <AgentModePersona mode={strategyMode} variant="compact" className="flex-1 min-w-[140px]" />
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-[11px]">
        <div>
          <dt className="text-zinc-500">Active mode</dt>
          <dd className="mt-0.5 text-sm text-zinc-200">{resolved.modeConfig.label}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Risk multiplier</dt>
          <dd className="mt-0.5 font-mono text-sm text-zinc-200">
            {resolved.modeConfig.riskMultiplier.toFixed(2)}×
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Max single-asset</dt>
          <dd className="mt-0.5 font-mono text-sm text-zinc-200">
            {formatPercentPlain(resolved.guardrails.maxSingleAssetAllocation)}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Max rebalance step</dt>
          <dd className="mt-0.5 font-mono text-sm text-zinc-200">
            {formatPercentPlain(resolved.guardrails.maxRebalanceSize)}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Cash reserve</dt>
          <dd className="mt-0.5 font-mono text-sm text-zinc-200">
            {formatPercentPlain(resolved.guardrails.cashReservePct)}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Rebalance intensity</dt>
          <dd className="mt-0.5 font-mono text-sm text-zinc-200">
            {formatPercentPlain(resolved.modeConfig.rebalanceIntensity)}
          </dd>
        </div>
      </dl>

      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-zinc-800/80 pt-2.5 text-[11px]">
        <div>
          <p className="text-zinc-500">Risk utilization</p>
          <p
            className={`mt-0.5 font-mono text-sm font-medium ${risk > 0.85 ? "text-amber-400" : "text-emerald-400"}`}
          >
            {formatAllocation(risk)}
          </p>
        </div>
        <div>
          <p className="text-zinc-500">Rebalance status</p>
          <p className="mt-0.5 leading-snug text-zinc-300">
            {blocked > 0
              ? `${blocked} leg(s) blocked (${strategyMode})`
              : "Within limits"}
          </p>
        </div>
      </div>
    </Panel>
  );
}
