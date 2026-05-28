"use client";

import { Panel } from "@/components/dashboard/panel";
import { RL_TICKERS } from "@/lib/constants";
import { topWeightedTicker } from "@/lib/dashboard-math";
import { formatAllocation, formatPercentPlain } from "@/lib/format";
import { useResolvedTargets } from "@/hooks/use-resolved-targets";
import { deriveTickerSignals, targetToWeights } from "@/lib/signal-engine";
import { useDashboardStore } from "@/store/dashboard-store";
import type { AllocationWeights, Ticker } from "@/types/rl-trading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const BAR_COLORS: Record<Ticker, string> = {
  AAPL: "#34d399",
  MSFT: "#60a5fa",
  GOOGL: "#fbbf24",
  AMZN: "#f87171",
  NVDA: "#a78bfa",
};

function ExposureAllocationChart({ weights }: { weights: AllocationWeights }) {
  return (
    <div className="flex h-full w-full min-h-0 flex-col justify-center gap-2.5">
      {RL_TICKERS.map((ticker) => {
        const weight = weights[ticker] ?? 0;
        const widthPct = Math.min(100, Math.max(0, weight * 100));

        return (
          <div
            key={ticker}
            className="grid w-full grid-cols-[68px_minmax(0,1fr)] items-center gap-3"
          >
            <span className="font-mono text-[11px] leading-none text-zinc-400">
              {ticker}
            </span>
            <div className="h-3.5 w-full overflow-hidden rounded-sm bg-zinc-800/75 pr-0.5">
              <div
                className="h-full rounded-sm transition-[width] duration-300 ease-out"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: BAR_COLORS[ticker],
                }}
                title={`${ticker} ${formatPercentPlain(weight)}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PortfolioExposurePanel() {
  const data = useDashboardStore((s) => s.dashboard?.data);
  const resolved = useResolvedTargets();

  if (!data || !resolved) {
    return (
      <Panel title="Portfolio Exposure" className="h-full min-h-[340px]">
        Loading…
      </Panel>
    );
  }

  const rows = deriveTickerSignals(
    data.current_allocation,
    resolved.adjustedTargets,
  );
  const cashWeight = Math.max(
    0,
    1 - RL_TICKERS.reduce((s, t) => s + (data.current_allocation[t] ?? 0), 0),
  );
  const targetWeights = targetToWeights(resolved.adjustedTargets);
  const top = topWeightedTicker(targetWeights);
  const concentration = Math.max(...resolved.adjustedTargets, 0);

  return (
    <Panel
      title="Portfolio Exposure"
      subtitle="Current vs mode-adjusted PPO target"
      className="h-full min-h-[340px]"
      bodyClassName="flex h-full min-h-0 flex-col gap-3"
    >
      {/* Chart — primary visual (~42% height) */}
      <div className="flex min-h-[148px] w-full flex-[4] shrink-0 flex-col">
        <ExposureAllocationChart weights={targetWeights} />
      </div>

      {/* Table */}
      <div className="flex min-h-0 flex-[5] flex-col border-t border-zinc-800/60 pt-3">
        <Table className="dashboard-table-compact">
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-500">Asset</TableHead>
              <TableHead className="text-right text-zinc-500">Current</TableHead>
              <TableHead className="text-right text-zinc-500">Target</TableHead>
              <TableHead className="text-right text-zinc-500">Delta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.ticker} className="border-zinc-800/80">
                <TableCell className="font-mono text-xs">{row.ticker}</TableCell>
                <TableCell className="text-right font-mono text-xs text-zinc-400">
                  {formatAllocation(row.current)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-amber-400/90">
                  {formatAllocation(row.target)}
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
              <TableCell colSpan={3} className="text-right font-mono text-xs text-zinc-400">
                {formatPercentPlain(cashWeight)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Footer summary */}
      <div className="grid shrink-0 grid-cols-3 gap-2 border-t border-zinc-800/50 pt-2 text-[10px] text-zinc-500">
        <span className="text-left">
          Top weight: <span className="text-zinc-300">{top.ticker}</span>
        </span>
        <span className="text-center">
          Cash:{" "}
          <span className="font-mono text-zinc-300">{formatPercentPlain(cashWeight)}</span>
        </span>
        <span className="text-right">
          Concentration:{" "}
          <span
            className={
              concentration > 0.35 ? "text-amber-400" : "text-zinc-300"
            }
          >
            {formatAllocation(concentration)}
          </span>
        </span>
      </div>
    </Panel>
  );
}
