"use client";

import { Panel } from "@/components/dashboard/panel";
import { useMarketWatch } from "@/hooks/use-market-watch";
import { ASSET_COLORS } from "@/lib/asset-colors";
import { formatAllocation } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Ticker } from "@/types/rl-trading";

function DeltaRow({
  ticker,
  delta,
  signal,
}: {
  ticker: Ticker;
  delta: number;
  signal: string;
}) {
  const positive = delta >= 0;
  return (
    <div className="grid grid-cols-[44px_1fr_auto] items-center gap-2">
      <span className="delta-label" style={{ color: ASSET_COLORS[ticker] }}>
        {ticker}
      </span>
      <div className="delta-bar-track">
        <div
          className={cn("delta-bar-fill", positive && "positive")}
          style={{
            width: `${Math.min(100, Math.abs(delta) * 400)}%`,
            marginLeft: positive ? undefined : "auto",
          }}
        />
      </div>
      <div className="text-right">
        <span className={cn("delta-value", positive && "positive")}>
          {formatAllocation(delta)}
        </span>
        <span className="delta-signal"> · {signal}</span>
      </div>
    </div>
  );
}

export function SignalBreakdownPanel() {
  const m = useMarketWatch();

  if (!m.ready) {
    return <Panel title="Signal Breakdown">Loading…</Panel>;
  }

  const buy = m.rows.filter((r) => r.bias === "Increase");
  const sell = m.rows.filter((r) => r.bias === "Reduce");
  const hold = m.rows.filter((r) => r.bias === "Hold");
  const sorted = [...m.rows].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const largestNegative = [...m.rows]
    .filter((r) => r.delta < 0)
    .sort((a, b) => a.delta - b.delta)[0];

  return (
    <Panel
      title="Signal Breakdown"
      subtitle="Allocation delta · mode-adjusted targets"
      className="h-full"
      bodyClassName="flex h-full min-h-0 flex-col gap-3 p-3"
    >
      <div className="grid grid-cols-3 gap-2">
        <div className="signal-pill buy">
          Buy bias
          <span className="count">{buy.length}</span>
        </div>
        <div className="signal-pill hold">
          Hold
          <span className="count">{hold.length}</span>
        </div>
        <div className="signal-pill sell">
          Sell bias
          <span className="count">{sell.length}</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-2">
        {sorted.map((row) => (
          <DeltaRow
            key={row.ticker}
            ticker={row.ticker}
            delta={row.delta}
            signal={row.signalLabel}
          />
        ))}
      </div>

      <p className="ms-summary-line border-t border-[rgba(128,144,118,0.1)] pt-2">
        Largest +Δ:{" "}
        <strong>
          {m.summary.largestDelta.delta >= 0
            ? `${m.summary.largestDelta.ticker} ${formatAllocation(m.summary.largestDelta.delta)}`
            : "—"}
        </strong>
        <span className="mx-1.5 opacity-40">·</span>
        Largest −Δ:{" "}
        <strong>
          {largestNegative
            ? `${largestNegative.ticker} ${formatAllocation(largestNegative.delta)}`
            : "—"}
        </strong>
      </p>
    </Panel>
  );
}
