"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART } from "@/lib/chart-styles";
import type { ReturnDistribution } from "@/lib/portfolio-analytics";

export function ReturnDistributionChart({ dist }: { dist: ReturnDistribution }) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dist.bins} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: CHART.axis, fontSize: 8, fontFamily: "var(--font-ibm-plex-mono)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: CHART.axis, fontSize: 9, fontFamily: "var(--font-ibm-plex-mono)" }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={CHART.tooltip}
          />
          <Bar
            dataKey="count"
            name="Periods"
            fill={CHART.bar}
            activeBar={{ fill: CHART.barHighlight }}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
