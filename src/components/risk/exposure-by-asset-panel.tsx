"use client";

import { Panel } from "@/components/dashboard/panel";
import { UtilizationBar } from "@/components/risk/utilization-bar";
import { ASSET_COLORS } from "@/lib/asset-colors";
import { useResolvedTargets } from "@/hooks/use-resolved-targets";
import { buildRiskContext, statusLabel } from "@/lib/risk-metrics";
import { formatAllocation } from "@/lib/format";
import { useDashboardStore } from "@/store/dashboard-store";
import { cn } from "@/lib/utils";

const statusTone = {
  ok: "text-emerald-400/90",
  near: "text-amber-400/90",
  breach: "text-red-400/90",
};

export function ExposureByAssetPanel() {
  const data = useDashboardStore((s) => s.dashboard?.data);
  const resolved = useResolvedTargets();

  if (!data || !resolved) {
    return <Panel title="Exposure by Asset">Loading…</Panel>;
  }

  const { exposureRows } = buildRiskContext(
    data.current_allocation,
    resolved.adjustedTargets,
    resolved.ppoTargets,
    resolved.guardrails,
    resolved.modeConfig,
  );

  return (
    <Panel
      title="Exposure by Asset"
      subtitle="Current vs target · limit utilization"
      className="h-full"
      bodyClassName="p-3"
    >
      <div className="mb-2 grid grid-cols-[44px_1fr_1fr_1fr_52px] gap-2 text-[10px] uppercase tracking-wide text-zinc-500">
        <span>Asset</span>
        <span className="text-right">Current</span>
        <span className="text-right">Target</span>
        <span className="text-right">Limit</span>
        <span className="text-right">Status</span>
      </div>
      <div className="space-y-2.5">
        {exposureRows.map((row) => (
          <div key={row.ticker} className="space-y-1">
            <div className="grid grid-cols-[44px_1fr_1fr_1fr_52px] items-center gap-2 text-[11px]">
              <span
                className="font-mono font-semibold"
                style={{ color: ASSET_COLORS[row.ticker] }}
              >
                {row.ticker}
              </span>
              <span className="text-right font-mono text-zinc-400">
                {formatAllocation(row.current)}
              </span>
              <span className="text-right font-mono text-amber-400/90">
                {formatAllocation(row.target)}
              </span>
              <span className="text-right font-mono text-zinc-500">
                {formatAllocation(row.limit)}
              </span>
              <span className={cn("text-right text-[10px] font-medium", statusTone[row.status])}>
                {statusLabel(row.status)}
              </span>
            </div>
            <div className="relative pl-[52px]">
              <UtilizationBar utilization={row.utilization} status={row.status} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
