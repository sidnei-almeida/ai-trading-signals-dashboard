"use client";

import { useMarketWatch } from "@/hooks/use-market-watch";
import { dataSourceDisplayLabel } from "@/lib/market-watch";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

function KpiCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "default";
}) {
  return (
    <div className="dash-kpi h-[72px] min-w-0 flex-1">
      <p className="dash-kpi-label">{label}</p>
      <p
        className={cn(
          "dash-kpi-value truncate text-sm",
          tone === "positive" && "is-positive",
          tone === "negative" && "is-negative",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function MarketKpiStrip() {
  const m = useMarketWatch();

  if (!m.ready) {
    return (
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="dash-kpi h-[72px] animate-pulse" />
        ))}
      </div>
    );
  }

  const sourceLabel = dataSourceDisplayLabel(m.data.data_source);

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
      <KpiCell label="Tracked assets" value={String(m.trackedCount)} />
      <KpiCell label="Data source" value={sourceLabel} />
      <KpiCell
        label="Strongest move"
        value={`${m.summary.strongest.ticker} ${formatPercent(m.summary.strongest.changePct)}`}
        tone="positive"
      />
      <KpiCell
        label="Weakest move"
        value={`${m.summary.weakest.ticker} ${formatPercent(m.summary.weakest.changePct)}`}
        tone="negative"
      />
      <KpiCell label="Buy bias" value={String(m.summary.buyBiasCount)} />
      <KpiCell label="Sell bias" value={String(m.summary.sellBiasCount)} />
      <KpiCell label="Avg move" value={formatPercent(m.summary.averageMove)} />
      <KpiCell
        label={m.replayActive ? "Replay step" : "Current bar"}
        value={m.replayActive ? `#${m.replayIndex}` : m.replayDate}
      />
    </div>
  );
}
