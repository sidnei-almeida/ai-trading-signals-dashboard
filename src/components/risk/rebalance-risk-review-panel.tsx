"use client";

import { Panel } from "@/components/dashboard/panel";
import { useResolvedTargets } from "@/hooks/use-resolved-targets";
import { buildRiskContext } from "@/lib/risk-metrics";
import { formatAllocation, formatPercentPlain } from "@/lib/format";
import { useDashboardStore } from "@/store/dashboard-store";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const decisionStyles = {
  Approved: "border-emerald-500/40 text-emerald-400",
  "Needs Review": "border-amber-500/40 text-amber-400",
  Blocked: "border-red-500/40 text-red-400",
};

export function RebalanceRiskReviewPanel() {
  const data = useDashboardStore((s) => s.dashboard?.data);
  const resolved = useResolvedTargets();

  if (!data || !resolved) {
    return <Panel title="Rebalance Risk Review">Loading…</Panel>;
  }

  const { review } = buildRiskContext(
    data.current_allocation,
    resolved.adjustedTargets,
    resolved.ppoTargets,
    resolved.guardrails,
    resolved.modeConfig,
  );

  return (
    <Panel
      title="Rebalance Risk Review"
      subtitle="Proposed mode-adjusted rebalance"
      className="h-full"
      bodyClassName="flex h-full min-h-0 flex-col gap-3 p-3"
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[11px]">
        <div>
          <dt className="text-zinc-500">Largest increase</dt>
          <dd className="font-mono text-zinc-200">
            {review.largestIncrease.ticker}{" "}
            <span className="text-emerald-400/90">
              {formatAllocation(review.largestIncrease.delta)}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Largest reduction</dt>
          <dd className="font-mono text-zinc-200">
            {review.largestReduction.ticker}{" "}
            <span className="text-red-400/90">
              {formatAllocation(review.largestReduction.delta)}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Max rebalance step</dt>
          <dd className="font-mono text-zinc-200">
            {formatAllocation(review.maxStepUsed)} /{" "}
            {formatPercentPlain(resolved.guardrails.maxRebalanceSize)}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Concentration after</dt>
          <dd className="font-mono text-zinc-200">
            {formatAllocation(review.concentrationAfter)}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-zinc-500">Cash after rebalance</dt>
          <dd className="font-mono text-zinc-200">
            {formatPercentPlain(review.cashAfter)} (min reserve{" "}
            {formatPercentPlain(resolved.guardrails.cashReservePct)})
          </dd>
        </div>
      </dl>

      <div className="mt-auto border-t border-zinc-800/70 pt-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
            Guardrail decision
          </span>
          <Badge
            variant="outline"
            className={cn("text-[10px]", decisionStyles[review.decision])}
          >
            {review.decision}
          </Badge>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">
          {review.decisionNote}
        </p>
      </div>
    </Panel>
  );
}
