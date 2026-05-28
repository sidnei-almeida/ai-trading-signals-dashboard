"use client";

import { useResolvedTargets } from "@/hooks/use-resolved-targets";
import { buildRiskContext } from "@/lib/risk-metrics";
import { formatAllocation, formatPercentPlain } from "@/lib/format";
import { useDashboardStore } from "@/store/dashboard-store";
import { cn } from "@/lib/utils";

function KpiCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "warning" | "default";
}) {
  return (
    <div className="dash-kpi h-[72px] min-w-0 flex-1">
      <p className="dash-kpi-label">{label}</p>
      <p
        className={cn(
          "dash-kpi-value truncate text-sm",
          tone === "positive" && "is-positive",
          tone === "negative" && "is-negative",
          tone === "warning" && "is-warning",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function RiskKpiStrip() {
  const data = useDashboardStore((s) => s.dashboard?.data);
  const resolved = useResolvedTargets();

  if (!data || !resolved) {
    return (
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dash-kpi h-[72px] animate-pulse" />
        ))}
      </div>
    );
  }

  const { kpis } = buildRiskContext(
    data.current_allocation,
    resolved.adjustedTargets,
    resolved.ppoTargets,
    resolved.guardrails,
    resolved.modeConfig,
  );

  const statusTone =
    kpis.overallStatus === "Blocked"
      ? "negative"
      : kpis.overallStatus === "Warning"
        ? "warning"
        : "positive";

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
      <KpiCell label="Risk status" value={kpis.overallStatus} tone={statusTone} />
      <KpiCell
        label="Risk utilization"
        value={formatAllocation(kpis.riskUtilization)}
        tone={kpis.riskUtilization > 0.85 ? "warning" : "default"}
      />
      <KpiCell
        label="Max asset exposure"
        value={`${formatPercentPlain(kpis.maxExposure)} / ${formatPercentPlain(kpis.maxExposureLimit)}`}
      />
      <KpiCell
        label="Cash reserve"
        value={`${formatPercentPlain(kpis.cashReserve)} / ${formatPercentPlain(kpis.cashReserveRequired)}`}
      />
      <KpiCell
        label="Rebalance step"
        value={`${formatPercentPlain(kpis.maxRebalanceStep)} / ${formatPercentPlain(kpis.maxRebalanceLimit)}`}
      />
      <KpiCell
        label="Blocked legs"
        value={String(kpis.blockedCount)}
        tone={kpis.blockedCount > 0 ? "negative" : "default"}
      />
    </div>
  );
}
