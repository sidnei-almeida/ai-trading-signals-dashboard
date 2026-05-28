"use client";

import { Panel } from "@/components/dashboard/panel";
import { MarketWatchTable } from "@/components/market-watch/market-watch-table";
import { currentMarketBarIndex } from "@/lib/dashboard-math";
import { buildMarketWatchRows, dataSourceDisplayLabel } from "@/lib/market-watch";
import { useResolvedTargets } from "@/hooks/use-resolved-targets";
import { useDashboardStore } from "@/store/dashboard-store";

export function MarketWatchPanel() {
  const { dashboard, replayActive, replayIndex } = useDashboardStore();
  const data = dashboard?.data;
  const resolved = useResolvedTargets();

  if (!data || !resolved) {
    return (
      <Panel title="Market Watch" className="h-full min-h-[240px]">
        Loading…
      </Panel>
    );
  }

  const barIdx = currentMarketBarIndex(data, replayActive, replayIndex);
  const rows = buildMarketWatchRows(data, resolved.adjustedTargets, barIdx);

  return (
    <Panel
      title="Market Watch"
      subtitle={`Market data · ${dataSourceDisplayLabel(data.data_source)}`}
      className="h-full min-h-[240px]"
      bodyClassName="flex h-full min-h-0 flex-col p-3"
    >
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <MarketWatchTable rows={rows} showDelta={false} />
      </div>
    </Panel>
  );
}
