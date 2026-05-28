"use client";

import { format } from "date-fns";

import { Panel } from "@/components/dashboard/panel";
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

export function ActivityLogPanel() {
  const activityLog = useDashboardStore((s) => s.activityLog);

  return (
    <Panel title="Agent Activity Log" subtitle="Simulated operations history">
      {activityLog.length === 0 ? (
        <p className="text-xs text-zinc-500">No events yet. Start agent or run rebalance.</p>
      ) : (
        <div className="max-h-[220px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-500">Time</TableHead>
                <TableHead className="text-zinc-500">Source</TableHead>
                <TableHead className="text-zinc-500">Event</TableHead>
                <TableHead className="text-zinc-500">Ticker</TableHead>
                <TableHead className="text-right text-zinc-500">Alloc</TableHead>
                <TableHead className="text-zinc-500">Action</TableHead>
                <TableHead className="text-zinc-500">Guardrail</TableHead>
                <TableHead className="text-zinc-500">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityLog.map((row) => (
                <TableRow key={row.id} className="border-zinc-800/80">
                  <TableCell className="whitespace-nowrap font-mono text-[10px] text-zinc-500">
                    {format(new Date(row.time), "HH:mm:ss")}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-400">{row.source}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-zinc-300">
                    {row.event}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.ticker}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-zinc-400">
                    {row.allocation !== null ? formatAllocation(row.allocation) : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.action}</TableCell>
                  <TableCell className="text-xs text-zinc-500">{row.guardrail}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] capitalize">
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
