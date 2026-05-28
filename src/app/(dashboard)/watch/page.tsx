"use client";

import { DataSourceStatusStrip } from "@/components/market-watch/data-source-status";
import { MarketKpiStrip } from "@/components/market-watch/market-kpi-strip";
import { MarketSummaryPanel } from "@/components/market-watch/market-summary-panel";
import { MarketWatchPageTable } from "@/components/market-watch/market-watch-page-table";
import { PriceTrendPanel } from "@/components/market-watch/price-trend-panel";
import { SignalBreakdownPanel } from "@/components/market-watch/signal-breakdown-panel";

export default function MarketWatchPage() {
  return (
    <div className="flex flex-col gap-3">
      <header>
        <h2 className="text-sm font-semibold text-zinc-100">Market Watch</h2>
        <p className="text-[11px] text-zinc-500">
          Local historical prices · replay state · mode-adjusted allocation signals.
        </p>
      </header>

      <MarketKpiStrip />

      <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <MarketWatchPageTable />
        <MarketSummaryPanel />
      </div>

      <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <PriceTrendPanel />
        <SignalBreakdownPanel />
      </div>

      <DataSourceStatusStrip />
    </div>
  );
}
