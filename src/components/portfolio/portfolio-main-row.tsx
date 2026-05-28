"use client";

import { useState } from "react";

import { PerformanceChart } from "@/components/charts/performance-chart";
import { Panel } from "@/components/dashboard/panel";
import { usePortfolioAnalytics } from "@/hooks/use-portfolio-analytics";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";

type RangeKey = "90d" | "365d" | "all";

function sliceHistorical(
  historical: {
    agent_history: number[];
    benchmark_history: number[];
    dates: string[];
  },
  range: RangeKey,
) {
  if (range === "all") return historical;
  const days = range === "90d" ? 90 : 365;
  const start = Math.max(0, historical.agent_history.length - days);
  return {
    agent_history: historical.agent_history.slice(start),
    benchmark_history: historical.benchmark_history.slice(start),
    dates: historical.dates.slice(start),
  };
}

export function PortfolioMainRow() {
  const a = usePortfolioAnalytics();
  const [range, setRange] = useState<RangeKey>("all");
  if (!a.ready) return null;

  const sliced = sliceHistorical(a.historical, range);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <Panel
        title="Portfolio Performance"
        subtitle="Paper portfolio vs Buy & Hold benchmark · Stooq historical"
        bodyClassName="flex min-h-0 flex-col"
        action={
          <div className="flex gap-1">
            {(["90d", "365d", "all"] as RangeKey[]).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? "secondary" : "ghost"}
                className="h-6 px-2 text-[10px]"
                onClick={() => setRange(r)}
              >
                {r === "all" ? "All" : r}
              </Button>
            ))}
          </div>
        }
      >
        <div className="mb-2 flex flex-wrap gap-x-4 text-[11px]">
          <span className="text-zinc-500">
            Agent{" "}
            <span className={a.agentReturn >= 0 ? "text-emerald-400" : "text-red-400"}>
              {formatPercent(calculateSliceReturn(sliced.agent_history))}
            </span>
          </span>
          <span className="text-zinc-500">
            Benchmark{" "}
            <span className="text-zinc-400">
              {formatPercent(calculateSliceReturn(sliced.benchmark_history))}
            </span>
          </span>
        </div>
        <div className="min-h-[320px] flex-1">
          <PerformanceChart
            historical={sliced}
            liveReplay={a.liveReplayPoints}
            className="h-full min-h-[300px]"
          />
        </div>
      </Panel>

      <Panel title="Performance Summary" subtitle="Paper portfolio analytics">
        <dl className="space-y-2.5 text-[11px]">
          <SummaryRow label="Starting value" value={formatCurrency(a.startValue)} />
          <SummaryRow label="Ending value" value={formatCurrency(a.endValue)} />
          <SummaryRow label="Total return" value={formatPercent(a.agentReturn)} />
          <SummaryRow label="Benchmark return" value={formatPercent(a.benchmarkReturn)} />
          <SummaryRow
            label="Alpha"
            value={formatPercent(a.alpha)}
            tone={a.alpha >= 0 ? "text-emerald-400" : "text-red-400"}
          />
          <SummaryRow label="Max drawdown" value={formatPercent(a.drawdown.maxDrawdown)} />
          <SummaryRow label="Volatility (σ)" value={formatPercent(a.volatility)} />
          <SummaryRow label="Rebalance events" value={String(a.rebalanceEvents)} />
          <SummaryRow label="Operating mode" value={a.modeLabel} />
        </dl>
        {!a.hasLiveSession ? (
          <p className="mt-3 border-t border-zinc-800/80 pt-2 text-[10px] leading-snug text-zinc-500">
            Static backtest from historical data. Start agent on Overview for live paper
            replay.
          </p>
        ) : null}
      </Panel>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className={`font-mono text-zinc-200 ${tone ?? ""}`}>{value}</dd>
    </div>
  );
}

function calculateSliceReturn(series: number[]): number {
  if (series.length < 2 || !series[0]) return 0;
  return (series[series.length - 1] - series[0]) / series[0];
}
