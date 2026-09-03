"use client";

import { Bar, BarChart, Cell, Tooltip, XAxis, YAxis } from "recharts";

import { ChartFrame } from "@/components/charts/chart-frame";
import { ASSET_COLORS } from "@/lib/asset-colors";
import { CHART } from "@/lib/chart-styles";
import { RL_TICKERS } from "@/lib/constants";
import { formatPercentPlain } from "@/lib/format";
import type { AllocationWeights } from "@/types/rl-trading";
import { cn } from "@/lib/utils";

export function AllocationBarChart({
  weights,
  className,
}: {
  weights: AllocationWeights;
  className?: string;
}) {
  const chartData = RL_TICKERS.map((t) => ({
    ticker: t,
    weight: weights[t] ?? 0,
    fill: ASSET_COLORS[t],
  }));

  return (
    <div className={cn("h-[132px] w-full shrink-0", className)}>
      <ChartFrame>
        <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 4, top: 0, bottom: 0 }}>
          <XAxis type="number" domain={[0, 1]} hide />
          <YAxis
            type="category"
            dataKey="ticker"
            tick={{ fill: CHART.axis, fontSize: 10, fontFamily: "var(--font-ibm-plex-mono)" }}
            width={44}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) => formatPercentPlain(Number(v))}
            contentStyle={CHART.tooltip}
          />
          <Bar dataKey="weight" radius={[0, 3, 3, 0]} barSize={14}>
            {chartData.map((entry) => (
              <Cell key={entry.ticker} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ChartFrame>
    </div>
  );
}
