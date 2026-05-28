"use client";

import { useResolvedTargets } from "@/hooks/use-resolved-targets";
import { Panel } from "@/components/dashboard/panel";
import { buildRebalanceQueue } from "@/lib/dashboard-math";
import { formatAllocation } from "@/lib/format";
import { executionActionFromDelta } from "@/lib/signal-engine";
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

export function SimulatedExecutionQueuePanel({
  showGuardrailColumn = false,
}: {
  showGuardrailColumn?: boolean;
}) {
  const data = useDashboardStore((s) => s.dashboard?.data);
  const resolved = useResolvedTargets();

  if (!data || !resolved) {
    return (
      <Panel title="Simulated Execution Queue" className="h-full min-h-[240px]">
        Loading…
      </Panel>
    );
  }

  const queue = buildRebalanceQueue(
    data.current_allocation,
    resolved.adjustedTargets,
    resolved.guardrails,
    resolved.ppoTargets,
  );

  return (
    <Panel
      title="Simulated Execution Queue"
      subtitle={
        showGuardrailColumn
          ? "Risk-reviewed rebalance queue · paper trading"
          : "Mode-adjusted rebalance — not broker execution"
      }
      className="h-full min-h-[240px]"
      bodyClassName="flex min-h-0 flex-col gap-2 p-4 pt-3"
    >
      <Table className="dashboard-table-compact min-h-0 flex-1">
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-transparent">
            <TableHead className="text-zinc-500">Ticker</TableHead>
            <TableHead className="text-right text-zinc-500">Current</TableHead>
            <TableHead className="text-right text-zinc-500" title="Mode-adjusted target">
              Target
            </TableHead>
            <TableHead className="text-right text-zinc-500" title="Raw PPO target">
              PPO
            </TableHead>
            <TableHead className="text-right text-zinc-500">Delta</TableHead>
            <TableHead className="text-zinc-500">Action</TableHead>
            {showGuardrailColumn ? (
              <TableHead className="text-zinc-500">Guardrail</TableHead>
            ) : null}
            <TableHead className="w-[88px] text-right text-zinc-500">Status</TableHead>
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
              <TableCell className="text-right font-mono text-xs text-zinc-500">
                {formatAllocation(row.ppoTargetWeight)}
              </TableCell>
              <TableCell
                className={`text-right font-mono text-xs ${row.delta >= 0 ? "text-emerald-400/80" : "text-red-400/80"}`}
              >
                {formatAllocation(row.delta)}
              </TableCell>
              <TableCell className="text-xs capitalize text-zinc-300">
                {executionActionFromDelta(row.delta)}
              </TableCell>
              {showGuardrailColumn ? (
                <TableCell className="max-w-[120px] truncate text-[10px] text-zinc-500">
                  {row.status === "blocked"
                    ? row.reason ?? "Blocked"
                    : row.status === "approved"
                      ? "Within limits"
                      : row.reason ?? "—"}
                </TableCell>
              ) : null}
              <TableCell className="text-right">
                <Badge
                  variant="outline"
                  className={`h-5 px-1.5 text-[10px] capitalize ${statusStyles[row.status]}`}
                >
                  {row.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="shrink-0 text-[10px] leading-snug text-zinc-500">
        Target = mode-adjusted · PPO = raw /predict output · paper trading demo
      </p>
    </Panel>
  );
}
