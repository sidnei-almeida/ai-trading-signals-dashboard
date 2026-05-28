"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchMarketDataBff } from "@/lib/api-bff";
import { currentMarketBarIndex } from "@/lib/dashboard-math";
import {
  buildMarketWatchRows,
  calculateNormalizedPriceSeries,
  summarizeMarketWatch,
} from "@/lib/market-watch";
import { RL_TICKERS } from "@/lib/constants";
import { useResolvedTargets } from "@/hooks/use-resolved-targets";
import { useDashboardStore } from "@/store/dashboard-store";

export function useMarketWatch() {
  const { dashboard, replayActive, replayIndex } = useDashboardStore();
  const resolved = useResolvedTargets();
  const [csvLoaded, setCsvLoaded] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMarketDataBff()
      .then((payload) => {
        if (!cancelled) setCsvLoaded(payload.rows.length > 0);
      })
      .catch(() => {
        if (!cancelled) setCsvLoaded(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const data = dashboard?.data;
    if (!data || !resolved) {
      return { ready: false as const };
    }

    const barIdx = currentMarketBarIndex(data, replayActive, replayIndex);
    const rows = buildMarketWatchRows(
      data,
      resolved.adjustedTargets,
      barIdx,
    );
    const summary = summarizeMarketWatch(rows);
    const normalizedSeries = calculateNormalizedPriceSeries(
      data.price_history,
      barIdx,
    );
    const replayDate = data.price_history[barIdx]?.Date ?? "—";

    return {
      ready: true as const,
      data,
      resolved,
      rows,
      summary,
      normalizedSeries,
      barIdx,
      replayDate,
      replayActive,
      replayIndex,
      csvLoaded,
      trackedCount: RL_TICKERS.length,
    };
  }, [dashboard, resolved, replayActive, replayIndex, csvLoaded]);
}
