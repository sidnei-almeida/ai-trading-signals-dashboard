"use client";

import { AllocationBarChart } from "@/components/charts/allocation-bar-chart";
import { Panel } from "@/components/dashboard/panel";
import { topWeightedTicker } from "@/lib/dashboard-math";
import { formatAllocation, formatPercentPlain } from "@/lib/format";
import { RL_TICKERS } from "@/lib/constants";
import { useDashboardStore } from "@/store/dashboard-store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AllocationPanel() {
  const data = useDashboardStore((s) => s.dashboard?.data);
  if (!data) return <Panel title="Current Allocation">Loading…</Panel>;

  const weights = data.current_allocation;
  const top = topWeightedTicker(weights);
  const cashWeight = Math.max(0, 1 - RL_TICKERS.reduce((s, t) => s + (weights[t] ?? 0), 0));

  return (
    <Panel
      title="Current Allocation"
      subtitle="Target portfolio weights from PPO policy (softmax)"
    >
      <AllocationBarChart weights={weights} />
      <Table className="mt-3">
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-transparent">
            <TableHead className="text-zinc-500">Asset</TableHead>
            <TableHead className="text-right text-zinc-500">Weight</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {RL_TICKERS.map((t) => (
            <TableRow key={t} className="border-zinc-800/80">
              <TableCell className="font-mono text-xs">{t}</TableCell>
              <TableCell className="text-right font-mono text-xs text-emerald-400/90">
                {formatAllocation(weights[t])}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="border-zinc-800/80">
            <TableCell className="text-xs text-zinc-500">Cash (residual)</TableCell>
            <TableCell className="text-right font-mono text-xs text-zinc-400">
              {formatPercentPlain(cashWeight)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <p className="mt-2 text-[11px] text-zinc-500">
        Top weight: <span className="text-zinc-300">{top.ticker}</span> at{" "}
        {formatAllocation(top.weight)}
      </p>
    </Panel>
  );
}
