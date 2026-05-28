"use client";

import { format } from "date-fns";

import { Panel } from "@/components/dashboard/panel";
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

function resolveSymbol(row: {
  symbol?: string;
  ticker?: string;
}): string {
  return row.symbol ?? row.ticker ?? "—";
}

export function SignalExecutionFeedPanel() {
  const activityLog = useDashboardStore((s) => s.activityLog);

  return (
    <Panel
      title="Signal & Execution Feed"
      subtitle="Live trading assistant activity · simulated"
      className="min-h-[300px]"
      bodyClassName="flex min-h-[260px] flex-col p-0"
    >
      {activityLog.length === 0 ? (
        <p className="px-4 py-3 text-xs text-zinc-500">
          No events yet. Start the agent or run a rebalance simulation.
        </p>
      ) : (
        <div className="min-h-[260px] flex-1 overflow-auto px-4 pb-4 pt-1">
          <Table className="dashboard-table-compact">
            <TableHeader className="sticky top-0 z-10 bg-[#1a2826] shadow-[0_1px_0_0_rgba(128,144,118,0.15)]">
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="w-[64px] text-zinc-500">Time</TableHead>
                <TableHead className="w-[72px] text-zinc-500">Source</TableHead>
                <TableHead className="w-[52px] text-zinc-500">Symbol</TableHead>
                <TableHead className="min-w-[140px] text-zinc-500">Event</TableHead>
                <TableHead className="w-[100px] text-zinc-500">Signal</TableHead>
                <TableHead className="w-[44px] text-right text-zinc-500">Conf.</TableHead>
                <TableHead className="w-[72px] text-zinc-500">Risk</TableHead>
                <TableHead className="w-[80px] text-zinc-500">Action</TableHead>
                <TableHead className="w-[80px] text-zinc-500">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityLog.map((row) => (
                <TableRow key={row.id} className="border-zinc-800/80">
                  <TableCell className="font-mono text-[10px] text-zinc-500">
                    {format(new Date(row.time), "HH:mm:ss")}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-400">{row.source}</TableCell>
                  <TableCell className="font-mono text-xs">{resolveSymbol(row)}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-zinc-300">
                    {row.event}
                  </TableCell>
                  <TableCell className="truncate text-xs text-amber-400/90">
                    {row.signal ?? row.action}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-zinc-500">
                    {row.confidence != null ? `${Math.round(row.confidence)}%` : "—"}
                  </TableCell>
                  <TableCell className="truncate text-xs text-zinc-500">
                    {row.riskCheck ?? row.guardrail ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.action}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="h-5 px-1.5 text-[10px] capitalize"
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  );
}
