"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART } from "@/lib/chart-styles";
import { formatPercent } from "@/lib/format";
import type { DrawdownPoint } from "@/lib/portfolio-analytics";

export function DrawdownChart({ series }: { series: DrawdownPoint[] }) {
  const data = series.map((p) => ({
    i: p.index,
    dd: p.value,
    date: p.date,
  }));

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
            tickFormatter={(v) => formatPercent(Number(v))}
            width={48}
          />
          <Tooltip
            contentStyle={CHART.tooltip}
            formatter={(v) => formatPercent(Number(v))}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as { date?: string; i?: number };
              return row?.date ?? `#${row?.i ?? ""}`;
            }}
          />
          <Area
            type="monotone"
            dataKey="dd"
            name="Drawdown"
            stroke={CHART.drawdown}
            fill={CHART.drawdownFill}
            strokeWidth={1.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
