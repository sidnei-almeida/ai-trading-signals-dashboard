"use client";

import { ASSET_COLORS } from "@/lib/asset-colors";
import { formatAllocation, formatCurrency, formatPercent } from "@/lib/format";
import type { MarketWatchRow } from "@/lib/market-watch";
import type { TickerBias } from "@/lib/signal-engine";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function trendTone(chg: number): string {
  if (chg > 0.02) return "text-emerald-400/90";
  if (chg < -0.02) return "text-red-400/85";
  return "text-zinc-500";
}

function signalTone(bias: TickerBias): string {
  if (bias === "Increase") return "text-emerald-400/85";
  if (bias === "Reduce") return "text-red-400/85";
  return "text-zinc-400";
}

const tableClass =
  "market-watch-table w-full table-fixed [&_[data-slot=table-head]]:h-9 [&_[data-slot=table-head]]:border-b [&_[data-slot=table-head]]:border-zinc-800/90 [&_[data-slot=table-head]]:px-2 [&_[data-slot=table-head]]:py-2 [&_[data-slot=table-head]]:text-[10px] [&_[data-slot=table-head]]:font-medium [&_[data-slot=table-head]]:uppercase [&_[data-slot=table-head]]:tracking-wide [&_[data-slot=table-cell]]:px-2 [&_[data-slot=table-cell]]:py-2.5 [&_[data-slot=table-row]]:h-10 [&_[data-slot=table-row]]:border-zinc-800/70 [&_[data-slot=table-row]]:hover:bg-zinc-800/20";

export function MarketWatchTable({
  rows,
  showDelta = true,
}: {
  rows: MarketWatchRow[];
  showDelta?: boolean;
}) {
  return (
    <Table className={tableClass}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[11%] text-left text-zinc-500">Ticker</TableHead>
          <TableHead className="w-[15%] text-right text-zinc-500">Price</TableHead>
          <TableHead className="w-[12%] text-right text-zinc-500">Chg</TableHead>
          <TableHead className="w-[10%] text-left text-zinc-500">Trend</TableHead>
          <TableHead className="w-[12%] text-right text-zinc-500">Current</TableHead>
          <TableHead className="w-[12%] text-right text-zinc-500">Target</TableHead>
          {showDelta ? (
            <TableHead className="w-[11%] text-right text-zinc-500">Delta</TableHead>
          ) : null}
          <TableHead className="text-left text-zinc-500">Signal</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.ticker}>
            <TableCell>
              <span
                className="font-mono text-[13px] font-semibold"
                style={{ color: ASSET_COLORS[row.ticker] }}
              >
                {row.ticker}
              </span>
            </TableCell>
            <TableCell className="text-right font-mono text-[13px] text-zinc-100">
              {formatCurrency(row.price)}
            </TableCell>
            <TableCell
              className={cn(
                "text-right font-mono text-[13px]",
                row.changePct >= 0 ? "text-emerald-400" : "text-red-400",
              )}
            >
              {formatPercent(row.changePct)}
            </TableCell>
            <TableCell className={cn("text-[12px]", trendTone(row.changePct))}>
              {row.trend}
            </TableCell>
            <TableCell className="text-right font-mono text-[12px] text-zinc-400">
              {formatAllocation(row.current)}
            </TableCell>
            <TableCell className="text-right font-mono text-[12px] text-amber-400/90">
              {formatAllocation(row.target)}
            </TableCell>
            {showDelta ? (
              <TableCell
                className={cn(
                  "text-right font-mono text-[12px]",
                  row.delta >= 0 ? "text-emerald-400/80" : "text-red-400/80",
                )}
              >
                {formatAllocation(row.delta)}
              </TableCell>
            ) : null}
            <TableCell className={cn("text-[12px]", signalTone(row.bias))}>
              {row.signalLabel}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
