"use client";

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
import { ASSET_COLORS } from "@/lib/asset-colors";
import { CHART } from "@/lib/chart-styles";
import { RL_TICKERS } from "@/lib/constants";
import type { NormalizedPricePoint } from "@/lib/market-watch";
import { cn } from "@/lib/utils";

export function NormalizedPriceChart({
  series,
  replayCursorIndex,
  className,
}: {
  series: NormalizedPricePoint[];
  replayCursorIndex?: number;
  className?: string;
}) {
  const cursor =
    replayCursorIndex != null && replayCursorIndex >= 0
      ? replayCursorIndex
      : undefined;

  return (
    <div className={cn("flex h-full min-h-[260px] w-full flex-col", className)}>
      <p className="mb-1 shrink-0 text-[10px] text-[var(--wasabi-dim)]">
        Indexed to 100 at window start · local price history
      </p>
      <div className="min-h-0 flex-1">
        <ChartFrame>
          <LineChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis
              dataKey="i"
              tick={{ fill: CHART.axis, fontSize: 9, fontFamily: "var(--font-ibm-plex-mono)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: CHART.axis, fontSize: 9, fontFamily: "var(--font-ibm-plex-mono)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${Number(v).toFixed(0)}`}
              width={36}
            />
            <Tooltip
              contentStyle={CHART.tooltip}
              formatter={(value, name) => [
                value != null ? `${Number(value).toFixed(2)}` : "—",
                String(name),
              ]}
              labelFormatter={(label, payload) => {
                const row = payload?.[0]?.payload as { date?: string } | undefined;
                return row?.date ? `${row.date} (#${label})` : `#${label}`;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4, color: "#809076" }} iconSize={8} />
            {cursor != null ? (
              <ReferenceLine
                x={cursor}
                stroke="#f8d794"
                strokeDasharray="3 3"
                strokeOpacity={0.7}
              />
            ) : null}
            {RL_TICKERS.map((ticker) => (
              <Line
                key={ticker}
                type="monotone"
                dataKey={ticker}
                name={ticker}
                stroke={ASSET_COLORS[ticker]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ChartFrame>
      </div>
    </div>
  );
}
