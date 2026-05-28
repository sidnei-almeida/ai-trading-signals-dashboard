"use client";

import { Panel } from "@/components/dashboard/panel";
import { useResolvedTargets } from "@/hooks/use-resolved-targets";
import { buildRiskContext } from "@/lib/risk-metrics";
import { useDashboardStore } from "@/store/dashboard-store";

const BLOCK_REASONS = [
  "Max single-asset allocation exceeded",
  "Max rebalance step too large",
  "Cash reserve would be violated",
  "Concentration limit exceeded",
] as const;

export function RejectedRecommendationsPanel() {
  const data = useDashboardStore((s) => s.dashboard?.data);
  const resolved = useResolvedTargets();

  if (!data || !resolved) {
    return <Panel title="Blocked Recommendations">Loading…</Panel>;
  }

  const { queue } = buildRiskContext(
    data.current_allocation,
    resolved.adjustedTargets,
    resolved.ppoTargets,
    resolved.guardrails,
    resolved.modeConfig,
  );
  const rejected = queue.filter((q) => q.status === "blocked");
  const latest = rejected[0];

  return (
    <Panel
      title="Blocked Recommendations"
      subtitle="Guardrail-blocked rebalance legs"
      className="h-full"
      bodyClassName="flex h-full min-h-0 flex-col gap-3 p-3"
    >
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-zinc-500">Total blocked</span>
        <span
          className={`font-mono text-sm font-semibold ${rejected.length > 0 ? "text-red-400" : "text-emerald-400"}`}
        >
          {rejected.length}
        </span>
      </div>

      {rejected.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center rounded-md border border-dashed border-zinc-800/80 bg-zinc-950/30 px-3 py-4 text-center">
          <p className="text-[11px] text-zinc-400">
            No blocked rebalance recommendations in the current session.
          </p>
          <p className="mt-1 text-[10px] text-zinc-600">
            All proposed legs are within active guardrail limits.
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {rejected.map((r) => (
            <li
              key={r.id}
              className="rounded border border-red-500/20 bg-red-950/20 px-2.5 py-2 text-[11px] text-red-300/90"
            >
              <span className="font-mono font-medium">{r.ticker}</span>
              <span className="text-red-400/60"> · </span>
              {r.reason ?? "Blocked by guardrails"}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto border-t border-zinc-800/60 pt-2.5">
        <p className="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-600">
          Common block reasons
        </p>
        <ul className="space-y-0.5 text-[10px] text-zinc-500">
          {BLOCK_REASONS.map((reason) => (
            <li key={reason}>· {reason}</li>
          ))}
        </ul>
        {latest?.reason ? (
          <p className="mt-2 text-[10px] text-zinc-600">
            Latest: <span className="text-zinc-400">{latest.reason}</span>
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
