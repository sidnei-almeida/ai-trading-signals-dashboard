"use client";

import { NormalizedPriceChart } from "@/components/charts/normalized-price-chart";
import { Panel } from "@/components/dashboard/panel";
import { useMarketWatch } from "@/hooks/use-market-watch";

export function PriceTrendPanel() {
  const m = useMarketWatch();

  if (!m.ready) {
    return (
      <Panel title="Price Trend" className="min-h-[300px]">
        Loading…
      </Panel>
    );
  }

  return (
    <Panel
      title="Price Trend"
      subtitle="Normalized performance · indexed to 100"
      className="h-full min-h-[300px]"
      bodyClassName="flex h-full min-h-0 flex-col p-3 pt-2"
    >
      <NormalizedPriceChart
        series={m.normalizedSeries}
        replayCursorIndex={m.replayActive ? m.barIdx : undefined}
        className="min-h-[260px] flex-1"
      />
    </Panel>
  );
}
