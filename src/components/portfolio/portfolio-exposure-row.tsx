"use client";

import { Panel } from "@/components/dashboard/panel";
import { RL_TICKERS } from "@/lib/constants";
import { topWeightedTicker } from "@/lib/dashboard-math";
import { usePortfolioAnalytics } from "@/hooks/use-portfolio-analytics";
import { formatAllocation, formatCurrency, formatPercentPlain } from "@/lib/format";
import { targetToWeights } from "@/lib/signal-engine";
import type { AllocationWeights, Ticker } from "@/types/rl-trading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const BAR_COLORS: Record<Ticker, string> = {
  AAPL: "#34d399",
  MSFT: "#60a5fa",
  GOOGL: "#fbbf24",
  AMZN: "#f87171",
  NVDA: "#a78bfa",
};

function AllocationBreakdownChart({ weights }: { weights: AllocationWeights }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col justify-evenly">
      {RL_TICKERS.map((ticker) => {
        const weight = weights[ticker] ?? 0;
        const widthPct = Math.min(100, Math.max(0, weight * 100));

        return (
          <div
            key={ticker}
            className="grid w-full grid-cols-[48px_minmax(0,1fr)_58px] items-center gap-2"
          >
            <span className="font-mono text-[11px] font-medium leading-none text-zinc-300">
              {ticker}
            </span>
            <div className="h-4 w-full overflow-hidden rounded-sm bg-zinc-800/70">
              <div
                className="h-full rounded-sm transition-[width] duration-300 ease-out"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: BAR_COLORS[ticker],
                }}
              />
            </div>
            <span className="text-right font-mono text-xs font-medium tabular-nums text-zinc-200">
              {formatAllocation(weight)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function PortfolioExposureRow() {
  const a = usePortfolioAnalytics();
  if (!a.ready) return null;

  const targetWeights = targetToWeights(a.resolved.adjustedTargets);
  const overweight = [...a.drift].sort((x, y) => y.delta - x.delta)[0];
  const underweight = [...a.drift].sort((x, y) => x.delta - y.delta)[0];

  return (
    <div className="grid items-stretch gap-5 lg:grid-cols-3">
      <Panel title="Current Exposure" subtitle="Simulated holdings · latest bar">
        <Table className="dashboard-table-compact">
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-500">Asset</TableHead>
              <TableHead className="text-right text-zinc-500">Price</TableHead>
              <TableHead className="text-right text-zinc-500">Weight</TableHead>
              <TableHead className="text-right text-zinc-500">Target</TableHead>
              <TableHead className="text-right text-zinc-500">Δ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {a.holdings.map((row) => (
              <TableRow key={row.ticker} className="border-zinc-800/80">
                <TableCell className="font-mono text-xs">{row.ticker}</TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {formatCurrency(row.price)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-zinc-400">
                  {formatAllocation(row.currentWeight)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-amber-400/90">
                  {formatAllocation(row.targetWeight)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono text-xs ${row.delta >= 0 ? "text-emerald-400/80" : "text-red-400/80"}`}
                >
                  {formatAllocation(row.delta)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="border-zinc-800/80">
              <TableCell className="text-xs text-zinc-500">Cash</TableCell>
              <TableCell colSpan={4} className="text-right font-mono text-xs text-zinc-400">
                {formatPercentPlain(a.cashWeight)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Panel>

      <Panel
        title="Allocation Breakdown"
        subtitle="Mode-adjusted target weights"
        className="h-full"
        bodyClassName="flex h-full min-h-0 flex-col gap-3"
      >
        <div className="flex min-h-[220px] flex-1 flex-col">
          <AllocationBreakdownChart weights={targetWeights} />
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-1 border-t border-zinc-800/60 pt-2.5 text-[10px] text-zinc-500 sm:grid-cols-4">
          <span>
            Top weight:{" "}
            <span className="font-mono text-zinc-300">
              {topWeightedTicker(targetWeights).ticker}
            </span>
          </span>
          <span>
            Total equity:{" "}
            <span className="font-mono text-zinc-300">
              {formatPercentPlain(
                RL_TICKERS.reduce((s, t) => s + (targetWeights[t] ?? 0), 0),
              )}
            </span>
          </span>
          <span>
            Concentration:{" "}
            <span
              className={
                Math.max(...a.resolved.adjustedTargets, 0) > 0.35
                  ? "font-mono text-amber-400/90"
                  : "font-mono text-zinc-300"
              }
            >
              {formatAllocation(Math.max(...a.resolved.adjustedTargets, 0))}
            </span>
          </span>
          <span>
            Cash:{" "}
            <span className="font-mono text-zinc-300">
              {formatPercentPlain(a.cashWeight)}
            </span>
          </span>
        </div>
      </Panel>

      <Panel title="Allocation Drift" subtitle="Current vs mode-adjusted PPO target">
        <div className="mb-2 text-[10px] text-zinc-500">
          Overweight:{" "}
          <span className="text-zinc-300">
            {overweight.ticker} ({formatAllocation(overweight.delta)})
          </span>
          <br />
          Underweight:{" "}
          <span className="text-zinc-300">
            {underweight.ticker} ({formatAllocation(underweight.delta)})
          </span>
        </div>
        <Table className="dashboard-table-compact">
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-500">Asset</TableHead>
              <TableHead className="text-right text-zinc-500">PPO</TableHead>
              <TableHead className="text-right text-zinc-500">Adj.</TableHead>
              <TableHead className="text-zinc-500">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {a.drift.map((row) => (
              <TableRow key={row.ticker} className="border-zinc-800/80">
                <TableCell className="font-mono text-xs">{row.ticker}</TableCell>
                <TableCell className="text-right font-mono text-xs text-zinc-500">
                  {formatAllocation(row.ppoTarget)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-amber-400/90">
                  {formatAllocation(row.target)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {row.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </div>
  );
}
