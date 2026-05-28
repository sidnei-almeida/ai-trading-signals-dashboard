"use client";

import { Panel } from "@/components/dashboard/panel";
import { MarketWatchTable } from "@/components/market-watch/market-watch-table";
import { useMarketWatch } from "@/hooks/use-market-watch";
import { dataSourceDisplayLabel } from "@/lib/market-watch";

export function MarketWatchPageTable() {
  const m = useMarketWatch();

  if (!m.ready) {
    return (
      <Panel title="Market Watch" className="h-full min-h-[280px]">
        Loading…
      </Panel>
    );
  }

  return (
    <Panel
      title="Market Watch"
      subtitle={`${dataSourceDisplayLabel(m.data.data_source)} · bar #${m.barIdx}`}
      className="h-full min-h-[280px]"
      bodyClassName="flex h-full min-h-0 flex-col p-3"
    >
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <MarketWatchTable rows={m.rows} showDelta />
      </div>
    </Panel>
  );
}
