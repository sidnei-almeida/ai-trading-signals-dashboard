"use client";

import { Panel } from "@/components/dashboard/panel";
import { buildRebalanceQueue } from "@/lib/dashboard-math";
import { formatAllocation } from "@/lib/format";
import { useDashboardStore } from "@/store/dashboard-store";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusStyles: Record<string, string> = {
  pending: "border-zinc-600 text-zinc-400",
  approved: "border-emerald-500/40 text-emerald-400",
  blocked: "border-red-500/40 text-red-400",
  simulated: "border-amber-500/40 text-amber-400",
};

export function RebalanceQueuePanel() {
  const { dashboard, guardrails, lastPrediction } = useDashboardStore();
  const data = dashboard?.data;
  if (!data) return <Panel title="Rebalance Queue">Loading…</Panel>;

  const targets =
    lastPrediction?.result.allocations ??
    Object.values(data.current_allocation);
  const queue = buildRebalanceQueue(data.current_allocation, targets, guardrails);

  return (
    <Panel
      title="Rebalance Queue"
      subtitle="Simulated orders toward target weights — not executed"
    >
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-transparent">
            <TableHead className="text-zinc-500">Ticker</TableHead>
            <TableHead className="text-right text-zinc-500">Current</TableHead>
            <TableHead className="text-right text-zinc-500">Target</TableHead>
            <TableHead className="text-right text-zinc-500">Delta</TableHead>
            <TableHead className="text-right text-zinc-500">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {queue.map((row) => (
            <TableRow key={row.id} className="border-zinc-800/80">
              <TableCell className="font-mono text-xs">{row.ticker}</TableCell>
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
              <TableCell className="text-right">
                <Badge
                  variant="outline"
                  className={`text-[10px] capitalize ${statusStyles[row.status]}`}
                >
                  {row.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-2 text-[10px] text-zinc-500">
        Simulated execution only. No broker integration.
      </p>
    </Panel>
  );
}
