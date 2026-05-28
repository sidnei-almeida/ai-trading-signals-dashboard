"use client";

import { useMemo, useState } from "react";

import { PerformanceChart } from "@/components/charts/performance-chart";
import { Panel } from "@/components/dashboard/panel";
import { computeReturn } from "@/lib/format";
import { formatPercent } from "@/lib/format";
import { useDashboardStore } from "@/store/dashboard-store";
import { cn } from "@/lib/utils";
import type { HistoricalChartSnapshot } from "@/types/rl-trading";

type RangeKey = "30d" | "90d" | "all";

function sliceHistorical(
  chart: HistoricalChartSnapshot,
  range: RangeKey,
): HistoricalChartSnapshot {
  if (range === "all") return chart;
  const days = range === "30d" ? 30 : 90;
  const start = Math.max(0, chart.agent_history.length - days);
  return {
    agent_history: chart.agent_history.slice(start),
    benchmark_history: chart.benchmark_history.slice(start),
    dates: chart.dates.slice(start),
  };
}

function metricsFromHistorical(chart: HistoricalChartSnapshot) {
  const agentReturn = computeReturn(chart.agent_history);
  const benchmarkReturn = computeReturn(chart.benchmark_history);
  const portfolioValue =
    chart.agent_history[chart.agent_history.length - 1] ?? 0;
  const benchmarkValue =
    chart.benchmark_history[chart.benchmark_history.length - 1] ?? 0;
  return {
    portfolioValue,
    benchmarkValue,
    agentReturn,
    benchmarkReturn,
    alpha: agentReturn - benchmarkReturn,
  };
}

function metricsFromLiveReplay(
  chart: HistoricalChartSnapshot,
  livePoints: { agent: number; benchmark: number }[],
) {
  if (livePoints.length === 0) {
    return metricsFromHistorical(chart);
  }
  const first = livePoints[0];
  const last = livePoints[livePoints.length - 1];
  const agentReturn = first.agent ? (last.agent - first.agent) / first.agent : 0;
  const benchmarkReturn = first.benchmark
    ? (last.benchmark - first.benchmark) / first.benchmark
    : 0;
  return {
    portfolioValue: last.agent,
    benchmarkValue: last.benchmark,
    agentReturn,
    benchmarkReturn,
    alpha: agentReturn - benchmarkReturn,
  };
}

export function PerformancePanel() {
  const historicalChart = useDashboardStore((s) => s.historicalChart);
  const liveReplayPoints = useDashboardStore((s) => s.liveReplayPoints);
  const replayIndex = useDashboardStore((s) => s.replayIndex);
  const replayActive = useDashboardStore((s) => s.replayActive);
  const dashboard = useDashboardStore((s) => s.dashboard?.data);
  const error = useDashboardStore((s) => s.error);
  const isLoading = useDashboardStore((s) => s.isLoading);
  const [range, setRange] = useState<RangeKey>("all");

  const historical = useMemo((): HistoricalChartSnapshot | null => {
    if (historicalChart) return historicalChart;
    if (!dashboard || dashboard.agent_history.length < 2) return null;
    return {
      agent_history: dashboard.agent_history,
      benchmark_history: dashboard.benchmark_history,
      dates: dashboard.price_history.map((p) => p.Date),
    };
  }, [historicalChart, dashboard]);

  if (!historical) {
    return (
      <Panel title="Portfolio Performance" className="h-full min-h-[340px]">
        <p className="text-sm text-zinc-500">
          {isLoading
            ? "Loading chart…"
            : error
              ? error
              : "No performance history yet. Refresh market data or run the agent replay."}
        </p>
      </Panel>
    );
  }

  const fullLen = historical.agent_history.length;
  const sliceStart =
    range === "all" ? 0 : Math.max(0, fullLen - (range === "30d" ? 30 : 90));
  const sliced = sliceHistorical(historical, range);
  const liveInRange = liveReplayPoints
    .filter((p) => p.index >= sliceStart)
    .map((p) => ({ ...p, index: p.index - sliceStart }));

  const m =
    liveReplayPoints.length > 0
      ? metricsFromLiveReplay(sliced, liveInRange)
      : metricsFromHistorical(sliced);
  const alphaTone = m.alpha >= 0 ? "text-emerald-400" : "text-red-400";

  const cursorIndex =
    replayActive || liveReplayPoints.length > 0
      ? replayIndex - sliceStart
      : undefined;

  return (
    <Panel
      title="Portfolio Performance"
      subtitle="Agent equity vs Buy & Hold benchmark · paper trading"
      className="h-full min-h-[340px]"
      bodyClassName="flex min-h-0 flex-col"
      action={
        <div className="flex shrink-0 gap-1">
          {(["30d", "90d", "all"] as RangeKey[]).map((r) => (
            <button
              key={r}
              type="button"
              className={cn(
                "dash-range-btn",
                range === r && "is-active",
              )}
              onClick={() => setRange(r)}
            >
              {r === "all" ? "All" : r}
            </button>
          ))}
        </div>
      }
    >
      <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[11px]">
        <div>
          <span className="text-zinc-500">
            {liveReplayPoints.length > 0 ? "Session " : ""}Agent{" "}
          </span>
          <span
            className={`font-mono font-medium ${m.agentReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}
          >
            {formatPercent(m.agentReturn)}
          </span>
        </div>
        <div>
          <span className="text-zinc-500">Benchmark </span>
          <span className="font-mono font-medium text-zinc-400">
            {formatPercent(m.benchmarkReturn)}
          </span>
        </div>
        <div>
          <span className="text-zinc-500">Alpha </span>
          <span className={`font-mono font-medium ${alphaTone}`}>
            {formatPercent(m.alpha)}
          </span>
        </div>
      </div>
      <PerformanceChart
        historical={sliced}
        liveReplay={liveInRange}
        replayCursorIndex={cursorIndex}
      />
    </Panel>
  );
}
