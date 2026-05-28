"use client";

import { Panel } from "@/components/dashboard/panel";
import { useMarketWatch } from "@/hooks/use-market-watch";
import { ASSET_COLORS } from "@/lib/asset-colors";
import { formatAllocation, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Ticker } from "@/types/rl-trading";

function SummaryRow({
  label,
  ticker,
  value,
  valueTone = "neutral",
}: {
  label: string;
  ticker?: Ticker;
  value: string;
  valueTone?: "positive" | "negative" | "neutral" | "muted";
}) {
  return (
    <div className="market-summary-row">
      <span className="ms-label">{label}</span>
      <span className={cn("ms-value", valueTone)}>
        {ticker ? (
          <span style={{ color: ASSET_COLORS[ticker] }} className="font-semibold">
            {ticker}
          </span>
        ) : null}
        {ticker ? " " : ""}
        {value}
      </span>
    </div>
  );
}

export function MarketSummaryPanel() {
  const m = useMarketWatch();

  if (!m.ready) {
    return <Panel title="Market Summary">Loading…</Panel>;
  }

  const { summary } = m;

  return (
    <Panel
      title="Market Summary"
      subtitle="Leaderboard · replay bar"
      className="h-full"
      bodyClassName="p-3"
    >
      <SummaryRow
        label="Strongest move"
        ticker={summary.strongest.ticker}
        value={formatPercent(summary.strongest.changePct)}
        valueTone="positive"
      />
      <SummaryRow
        label="Weakest move"
        ticker={summary.weakest.ticker}
        value={formatPercent(summary.weakest.changePct)}
        valueTone="negative"
      />
      <SummaryRow
        label="Highest target"
        ticker={summary.highestTarget.ticker}
        value={formatAllocation(summary.highestTarget.weight)}
        valueTone="neutral"
      />
      <SummaryRow
        label="Largest delta"
        ticker={summary.largestDelta.ticker}
        value={formatAllocation(summary.largestDelta.delta)}
        valueTone={summary.largestDelta.delta >= 0 ? "positive" : "negative"}
      />
      <SummaryRow label="Buy bias" value={`${summary.buyBiasCount} assets`} valueTone="muted" />
      <SummaryRow label="Sell bias" value={`${summary.sellBiasCount} assets`} valueTone="muted" />
      <SummaryRow label="Hold / neutral" value={`${summary.holdCount} assets`} valueTone="muted" />
    </Panel>
  );
}
