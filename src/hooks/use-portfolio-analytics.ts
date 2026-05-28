"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { PriceHistoryPoint } from "@/types/rl-trading";

import { resolveFromDashboard } from "@/lib/allocation-targets";
import { fetchMarketDataBff } from "@/lib/api-bff";
import { INITIAL_BALANCE } from "@/lib/constants";
import {
  buildHoldingsRows,
  calculateAllocationDrift,
  calculateCorrelationMatrix,
  calculateMaxDrawdown,
  calculateReturnDistribution,
  calculateRiskMetrics,
  calculateTickerReturns,
  calculateTotalReturn,
  calculateVolatility,
  cashWeight,
  topConcentration,
} from "@/lib/portfolio-analytics";
import { getOperatingModeConfig } from "@/lib/operating-modes";
import type { HistoricalChartSnapshot } from "@/types/rl-trading";
import type { MarketDataRow } from "@/lib/market-csv";
import { useDashboardStore } from "@/store/dashboard-store";

export type PortfolioAnalyticsResult =
  | { ready: false; message: string; marketError: string | null }
  | {
      ready: true;
      marketError: string | null;
      marketRows: MarketDataRow[];
      historical: HistoricalChartSnapshot;
      liveReplayPoints: ReturnType<typeof useDashboardStore.getState>["liveReplayPoints"];
      resolved: ReturnType<typeof resolveFromDashboard>;
      strategyMode: ReturnType<typeof useDashboardStore.getState>["strategyMode"];
      modeLabel: string;
      agentHistory: number[];
      benchmarkHistory: number[];
      dates: string[];
      startValue: number;
      endValue: number;
      portfolioValue: number;
      agentReturn: number;
      benchmarkReturn: number;
      alpha: number;
      drawdown: ReturnType<typeof calculateMaxDrawdown>;
      volatility: number;
      returnDist: ReturnType<typeof calculateReturnDistribution>;
      risk: ReturnType<typeof calculateRiskMetrics>;
      concentration: ReturnType<typeof topConcentration>;
      bestAsset: ReturnType<typeof calculateTickerReturns>[0] | null;
      tickerReturns: ReturnType<typeof calculateTickerReturns>;
      drift: ReturnType<typeof calculateAllocationDrift>;
      holdings: ReturnType<typeof buildHoldingsRows>;
      correlation: ReturnType<typeof calculateCorrelationMatrix> | null;
      cashWeight: number;
      rebalanceEvents: number;
      hasLiveSession: boolean;
      lastPrices: PriceHistoryPoint;
    };

export const PortfolioAnalyticsContext =
  createContext<PortfolioAnalyticsResult | null>(null);

export function usePortfolioAnalytics(): PortfolioAnalyticsResult {
  const ctx = useContext(PortfolioAnalyticsContext);
  if (!ctx) {
    throw new Error(
      "usePortfolioAnalytics must be used within PortfolioAnalyticsProvider",
    );
  }
  return ctx;
}

export function usePortfolioAnalyticsInternal(): PortfolioAnalyticsResult {
  const dashboard = useDashboardStore((s) => s.dashboard?.data);
  const historicalChart = useDashboardStore((s) => s.historicalChart);
  const liveReplayPoints = useDashboardStore((s) => s.liveReplayPoints);
  const lastPrediction = useDashboardStore((s) => s.lastPrediction);
  const strategyMode = useDashboardStore((s) => s.strategyMode);
  const activityLog = useDashboardStore((s) => s.activityLog);
  const [marketRows, setMarketRows] = useState<MarketDataRow[]>([]);
  const [marketError, setMarketError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const payload = await fetchMarketDataBff();
        setMarketRows(payload.rows);
        setMarketError(null);
      } catch (e) {
        setMarketRows([]);
        setMarketError(
          e instanceof Error ? e.message : "Market data unavailable",
        );
      }
    })();
  }, []);

  return useMemo(() => {
    if (!dashboard) {
      return {
        ready: false as const,
        message:
          marketError ??
          "Historical market data not found. Run npm run data:stooq.",
        marketError,
      };
    }

    const historical: HistoricalChartSnapshot = historicalChart ?? {
      agent_history: dashboard.agent_history,
      benchmark_history: dashboard.benchmark_history,
      dates: dashboard.price_history.map((p) => p.Date),
    };

    const agentHistory = historical.agent_history;
    const benchmarkHistory = historical.benchmark_history;
    const dates = historical.dates;

    const startValue = agentHistory[0] ?? INITIAL_BALANCE;
    const endValue = agentHistory[agentHistory.length - 1] ?? startValue;
    const portfolioValue = endValue;

    const resolved = resolveFromDashboard(
      dashboard,
      lastPrediction?.result.allocations,
      strategyMode,
    );

    const barIdx =
      liveReplayPoints.length > 0
        ? liveReplayPoints[liveReplayPoints.length - 1].index
        : dashboard.price_history.length - 1;
    const lastPrices =
      dashboard.price_history[
        Math.min(barIdx, dashboard.price_history.length - 1)
      ] ?? dashboard.price_history[dashboard.price_history.length - 1];

    const agentReturn = calculateTotalReturn(agentHistory);
    const benchmarkReturn = calculateTotalReturn(benchmarkHistory);
    const alpha = agentReturn - benchmarkReturn;
    const drawdown = calculateMaxDrawdown(agentHistory, dates);
    const volatility = calculateVolatility(agentHistory);
    const returnDist = calculateReturnDistribution(agentHistory);
    const risk = calculateRiskMetrics(agentHistory, dates);
    const concentration = topConcentration(dashboard.current_allocation);

    const tickerReturns =
      marketRows.length > 0
        ? calculateTickerReturns(
            marketRows,
            0,
            Math.min(barIdx, marketRows.length - 1),
            dashboard.current_allocation,
          )
        : [];

    const bestAsset = tickerReturns.length
      ? [...tickerReturns].sort((a, b) => b.assetReturn - a.assetReturn)[0]
      : null;

    const drift = calculateAllocationDrift(
      dashboard.current_allocation,
      resolved.adjustedTargets,
      resolved.ppoTargets,
    );

    const holdings = buildHoldingsRows(
      portfolioValue,
      lastPrices,
      dashboard.current_allocation,
      resolved.adjustedTargets,
      resolved.ppoTargets,
    );

    const correlation =
      marketRows.length > 20 ? calculateCorrelationMatrix(marketRows) : null;

    const rebalanceEvents = activityLog.filter(
      (e) => e.action === "REBALANCE" || e.event.toLowerCase().includes("tick"),
    ).length;

    const hasLiveSession = liveReplayPoints.length > 0;

    return {
      ready: true as const,
      marketError,
      marketRows,
      historical,
      liveReplayPoints,
      resolved,
      strategyMode,
      modeLabel: getOperatingModeConfig(strategyMode).label,
      agentHistory,
      benchmarkHistory,
      dates,
      startValue,
      endValue,
      portfolioValue,
      agentReturn,
      benchmarkReturn,
      alpha,
      drawdown,
      volatility,
      returnDist,
      risk,
      concentration,
      bestAsset,
      tickerReturns,
      drift,
      holdings,
      correlation,
      cashWeight: cashWeight(dashboard.current_allocation),
      rebalanceEvents,
      hasLiveSession,
      lastPrices,
    };
  }, [
    dashboard,
    historicalChart,
    liveReplayPoints,
    lastPrediction,
    strategyMode,
    activityLog,
    marketRows,
    marketError,
  ]);
}
