"use client";

import { Panel } from "@/components/dashboard/panel";
import { ASSET_COLORS } from "@/lib/asset-colors";
import { POLICY_MODEL_INFO, RL_TICKERS } from "@/lib/constants";
import { concentrationScore } from "@/lib/format";
import { formatAllocation, formatNumber } from "@/lib/format";
import { useDashboardStore } from "@/store/dashboard-store";
import { Badge } from "@/components/ui/badge";

function buildInterpretation(
  allocations: number[],
  topTicker: (typeof RL_TICKERS)[number],
  concentration: number,
): string {
  const topWeight = allocations[RL_TICKERS.indexOf(topTicker)] ?? 0;
  const parts: string[] = [
    `Policy currently favors ${topTicker} at ${formatAllocation(topWeight)} target weight.`,
  ];
  if (concentration > 0.35) {
    parts.push(
      `Concentration at ${formatAllocation(concentration)} — elevated vs typical diversification guardrails.`,
    );
  } else {
    parts.push("Target mix remains relatively diversified across the five-name universe.");
  }
  return parts.join(" ");
}

export function PolicyOutputPanel() {
  const { dashboard, lastPrediction } = useDashboardStore();
  const data = dashboard?.data;
  const pred = lastPrediction?.result;

  if (!data) {
    return (
      <Panel title="PPO Policy Output" className="h-full">
        Loading…
      </Panel>
    );
  }

  const allocations = pred?.allocations ?? RL_TICKERS.map(() => 1 / RL_TICKERS.length);
  const raw = pred?.raw_action ?? allocations.map(() => 0);
  const concentration = concentrationScore(allocations);
  const topIdx = allocations.indexOf(Math.max(...allocations));
  const topTicker = RL_TICKERS[topIdx];
  const interpretation = buildInterpretation(allocations, topTicker, concentration);

  return (
    <Panel
      title="PPO Policy Output"
      subtitle="Softmax(logits) → portfolio weights"
      className="h-full"
      bodyClassName="flex flex-col gap-3 p-3"
      action={
        <Badge
          variant="outline"
          className={
            lastPrediction?.isLive
              ? "border-emerald-500/40 text-[10px] text-emerald-400"
              : "border-amber-500/40 text-[10px] text-amber-400"
          }
        >
          {lastPrediction?.isLive ? "Live" : "Demo"}
        </Badge>
      }
    >
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          raw_action (logits)
        </p>
        <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-zinc-300">
          [{raw.map((v) => formatNumber(v)).join(", ")}]
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Target allocations
        </p>
        <ul className="space-y-1">
          {RL_TICKERS.map((ticker, i) => (
            <li key={ticker} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-mono font-medium" style={{ color: ASSET_COLORS[ticker] }}>
                {ticker}
              </span>
              <span
                className={`font-mono tabular-nums ${i === topIdx ? "font-semibold text-amber-400/95" : "text-zinc-200"}`}
              >
                {formatAllocation(allocations[i])}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-zinc-800/70 pt-2.5 sm:grid-cols-4">
        <div>
          <p className="text-[10px] text-zinc-500">Top asset</p>
          <p className="font-mono text-sm font-medium" style={{ color: ASSET_COLORS[topTicker] }}>
            {topTicker}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500">Concentration</p>
          <p className="font-mono text-sm text-zinc-200">{formatAllocation(concentration)}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500">Runtime</p>
          <p className="text-[11px] text-zinc-300">{POLICY_MODEL_INFO.runtime}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500">Status</p>
          <p className="text-[11px] text-zinc-300">
            {lastPrediction
              ? lastPrediction.isLive
                ? "Live inference"
                : "Demo fallback"
              : "Awaiting run"}
          </p>
        </div>
      </div>

      <div className="mt-auto border-t border-zinc-800/70 pt-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Interpretation
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{interpretation}</p>
      </div>
    </Panel>
  );
}
