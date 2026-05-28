"use client";

import { Panel } from "@/components/dashboard/panel";
import { usePortfolioAnalytics } from "@/hooks/use-portfolio-analytics";
import { formatAllocation, formatCurrency, formatNumber } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function PortfolioHoldingsTable() {
  const a = usePortfolioAnalytics();
  if (!a.ready) return null;

  return (
    <Panel
      title="Holdings Exposure"
      subtitle="Paper portfolio · simulated holdings · PPO target allocation"
    >
      <Table className="dashboard-table-compact">
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-transparent">
            <TableHead className="text-zinc-500">Asset</TableHead>
            <TableHead className="text-right text-zinc-500">Price</TableHead>
            <TableHead className="text-right text-zinc-500">Shares</TableHead>
            <TableHead className="text-right text-zinc-500">Current</TableHead>
            <TableHead className="text-right text-zinc-500">Target</TableHead>
            <TableHead className="text-right text-zinc-500">PPO</TableHead>
            <TableHead className="text-right text-zinc-500">Delta</TableHead>
            <TableHead className="text-right text-zinc-500">Notional</TableHead>
            <TableHead className="text-zinc-500">Signal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {a.holdings.map((row) => (
            <TableRow key={row.ticker} className="border-zinc-800/80">
              <TableCell className="font-mono text-xs font-medium">{row.ticker}</TableCell>
              <TableCell className="text-right font-mono text-xs">
                {formatCurrency(row.price)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-zinc-400">
                {formatNumber(row.shares)}
              </TableCell>
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
              <TableCell className="text-right font-mono text-xs">
                {formatCurrency(row.notional)}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  {row.signal}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}
