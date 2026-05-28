"use client";

import { Panel } from "@/components/dashboard/panel";
import { UtilizationBar } from "@/components/risk/utilization-bar";
import { useResolvedTargets } from "@/hooks/use-resolved-targets";
import { buildRiskContext, statusLabel } from "@/lib/risk-metrics";
import { useDashboardStore } from "@/store/dashboard-store";
import { cn } from "@/lib/utils";

const statusTone = {
  ok: "text-emerald-400/90",
  near: "text-amber-400/90",
  breach: "text-red-400/90",
};

export function GuardrailStatusPanel() {
  const data = useDashboardStore((s) => s.dashboard?.data);
  const resolved = useResolvedTargets();

  if (!data || !resolved) {
    return <Panel title="Guardrail Status">Loading…</Panel>;
  }

  const { guardrailRows } = buildRiskContext(
    data.current_allocation,
    resolved.adjustedTargets,
    resolved.ppoTargets,
    resolved.guardrails,
    resolved.modeConfig,
  );

  return (
    <Panel
      title="Guardrail Status"
      subtitle="Active limits · read-only monitor"
      className="h-full"
      bodyClassName="space-y-3 p-3"
    >
      {guardrailRows.map((row) => (
        <div key={row.id} className="space-y-1.5 border-b border-zinc-800/50 pb-2.5 last:border-0 last:pb-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-medium text-zinc-300">{row.label}</p>
            <span className={cn("text-[10px] font-medium uppercase", statusTone[row.status])}>
              {statusLabel(row.status)}
            </span>
          </div>
          <div className="flex justify-between gap-2 text-[10px] text-zinc-500">
            <span>
              Current: <span className="font-mono text-zinc-300">{row.currentLabel}</span>
            </span>
            <span>
              Limit: <span className="font-mono text-zinc-400">{row.limitLabel}</span>
            </span>
          </div>
          <UtilizationBar utilization={row.utilization} status={row.status} />
        </div>
      ))}
    </Panel>
  );
}
