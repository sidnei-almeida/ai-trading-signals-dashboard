"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartFrame } from "@/components/charts/chart-frame";
import { CHART } from "@/lib/chart-styles";
import { formatCompactCurrency } from "@/lib/format";
import type { HistoricalChartSnapshot, LiveReplayPoint } from "@/types/rl-trading";
import { cn } from "@/lib/utils";

export function PerformanceChart({
  historical,
  liveReplay = [],
  replayCursorIndex,
  className,
}: {
  historical: HistoricalChartSnapshot;
  liveReplay?: LiveReplayPoint[];
  replayCursorIndex?: number;
  className?: string;
}) {
  // "All" spans the full history (~2.5k points); rebuilding it on every render
  // makes each resize far more expensive than it needs to be.
  const chartData = useMemo(() => {
    const liveByIndex = new Map(liveReplay.map((p) => [p.index, p]));
    return historical.agent_history.map((agentHist, i) => {
      const live = liveByIndex.get(i);
      return {
        i,
        date: historical.dates[i],
        agentHistorical: agentHist,
        benchmark: historical.benchmark_history[i] ?? agentHist,
        agentLive: live?.agent ?? null,
        benchmarkLive: live?.benchmark ?? null,
      };
    });
  }, [historical, liveReplay]);

  const hasLive = liveReplay.length > 0;
  const lastLive = liveReplay[liveReplay.length - 1];
  const agentEnd = hasLive
    ? (lastLive?.agent ?? 0)
    : (historical.agent_history[historical.agent_history.length - 1] ?? 0);
  const benchEnd = hasLive
    ? (lastLive?.benchmark ?? 0)
    : (historical.benchmark_history[historical.benchmark_history.length - 1] ?? 0);
  const drawdown =
    agentEnd < benchEnd ? "Trailing benchmark" : "Leading benchmark";

  const cursor =
    replayCursorIndex != null && replayCursorIndex >= 0
      ? replayCursorIndex
      : undefined;

  return (
    <div className={cn("flex w-full flex-col", className)}>
      <p className="mb-1 shrink-0 text-[10px] text-[var(--wasabi-dim)]">
        {drawdown}
        {hasLive ? " · live replay overlay" : ""}
      </p>
      <div className="h-[240px] w-full shrink-0">
        <ChartFrame>
          <LineChart data={chartData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis
              dataKey="i"
              tick={{ fill: CHART.axis, fontSize: 9, fontFamily: "var(--font-ibm-plex-mono)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: CHART.axis, fontSize: 9, fontFamily: "var(--font-ibm-plex-mono)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCompactCurrency(v)}
              width={52}
            />
            <Tooltip
              contentStyle={CHART.tooltip}
              formatter={(value, name) => {
                if (value == null || value === "") return ["—", String(name)];
                return [formatCompactCurrency(Number(value)), String(name)];
              }}
              labelFormatter={(label, payload) => {
                const row = payload?.[0]?.payload as { date?: string } | undefined;
                return row?.date ? `${row.date} (#${label})` : `#${label}`;
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 4, color: "#809076" }}
              iconSize={8}
            />
            {cursor != null ? (
              <ReferenceLine
                x={cursor}
                stroke="#f8d794"
                strokeDasharray="3 3"
                strokeOpacity={0.7}
                label={{
                  value: "Replay",
                  position: "insideTopRight",
                  fill: "#f8d794",
                  fontSize: 9,
                }}
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="benchmark"
              name="Buy & Hold"
              stroke={CHART.benchmark}
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 4"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="agentHistorical"
              name="PPO Backtest"
              stroke={CHART.agent}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {hasLive ? (
              <Line
                type="monotone"
                dataKey="agentLive"
                name="Live Replay"
                stroke={CHART.agent}
                strokeWidth={2.5}
                dot={{ r: 2, fill: CHART.agent }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ) : null}
          </LineChart>
        </ChartFrame>
      </div>
    </div>
  );
}
