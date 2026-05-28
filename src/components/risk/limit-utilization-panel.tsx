"use client";

import { Panel } from "@/components/dashboard/panel";
import { UtilizationBar } from "@/components/risk/utilization-bar";
import { useResolvedTargets } from "@/hooks/use-resolved-targets";
import { buildRiskContext } from "@/lib/risk-metrics";
import { formatAllocation } from "@/lib/format";
import { useDashboardStore } from "@/store/dashboard-store";

export function LimitUtilizationPanel() {
  const data = useDashboardStore((s) => s.dashboard?.data);
  const resolved = useResolvedTargets();

  if (!data || !resolved) {
    return <Panel title="Limit Utilization">Loading…</Panel>;
  }

  const { guardrailRows, kpis } = buildRiskContext(
    data.current_allocation,
    resolved.adjustedTargets,
    resolved.ppoTargets,
    resolved.guardrails,
    resolved.modeConfig,
  );

  const metrics = guardrailRows.filter((r) => r.id !== "mode");

  return (
    <Panel
      title="Limit Utilization"
      subtitle="Headroom across active guardrails"
      className="h-full"
      bodyClassName="flex h-full min-h-0 flex-col gap-3 p-3"
    >
      <div className="rounded-md border border-zinc-800/70 bg-zinc-950/40 px-2.5 py-2 text-center">
        <p className="text-[10px] text-zinc-500">Aggregate risk utilization</p>
        <p
          className={`mt-0.5 font-mono text-lg font-semibold ${kpis.riskUtilization > 0.85 ? "text-amber-400" : "text-emerald-400"}`}
        >
          {formatAllocation(kpis.riskUtilization)}
        </p>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3">
        {metrics.map((row) => (
          <div key={row.id}>
            <div className="mb-1 flex justify-between text-[10px]">
              <span className="text-zinc-500">{row.label}</span>
              <span className="font-mono text-zinc-400">
                {formatAllocation(row.utilization)}
              </span>
            </div>
            <UtilizationBar utilization={row.utilization} status={row.status} />
          </div>
        ))}
      </div>
    </Panel>
  );
}
