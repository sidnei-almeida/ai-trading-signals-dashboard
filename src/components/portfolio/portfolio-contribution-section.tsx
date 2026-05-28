"use client";

import { Fragment } from "react";

import { Panel } from "@/components/dashboard/panel";
import { usePortfolioAnalytics } from "@/hooks/use-portfolio-analytics";
import { ASSET_COLORS, correlationHeatmapCellStyle } from "@/lib/asset-colors";
import { RL_TICKERS } from "@/lib/constants";
import { formatAllocation, formatCurrency, formatPercent } from "@/lib/format";
import type { TickerReturnRow } from "@/lib/portfolio-analytics";
import type { Ticker } from "@/types/rl-trading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PortfolioContributionSection() {
  const a = usePortfolioAnalytics();
  if (!a.ready) return null;

  return (
    <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <Panel
        title="Asset Contribution"
        subtitle="Ticker returns · Stooq historical · weight-weighted estimate"
        className="h-full min-h-[320px]"
        bodyClassName="flex h-full min-h-0 flex-col gap-3"
      >
        {a.tickerReturns.length === 0 ? (
          <p className="text-xs text-zinc-500">
            Market rows unavailable. Run npm run data:stooq.
          </p>
        ) : (
          <AssetContributionContent rows={a.tickerReturns} />
        )}
      </Panel>

      <Panel
        title="Asset Correlation Matrix"
        subtitle="Daily return correlation · local CSV"
        className="h-full min-h-[320px]"
        bodyClassName="flex h-full min-h-0 flex-col gap-3"
      >
        {a.correlation ? (
          <CorrelationHeatmap matrix={a.correlation} />
        ) : (
          <p className="text-xs text-zinc-500">Need more market history for correlation.</p>
        )}
      </Panel>
    </div>
  );
}

function contributionInsights(rows: TickerReturnRow[]) {
  const topContributor = rows.reduce((best, row) =>
    Math.abs(row.contributionEstimate) > Math.abs(best.contributionEstimate) ? row : best,
  );
  const highestReturn = rows.reduce((best, row) =>
    row.assetReturn > best.assetReturn ? row : best,
  );
  const avgContribution =
    rows.reduce((sum, row) => sum + row.contributionEstimate, 0) / rows.length;
  const totalAbs = rows.reduce(
    (sum, row) => sum + Math.abs(row.contributionEstimate),
    0,
  );
  const share =
    totalAbs > 0 ? Math.abs(topContributor.contributionEstimate) / totalAbs : 0;

  return { topContributor, highestReturn, avgContribution, share };
}

function AssetContributionContent({ rows }: { rows: TickerReturnRow[] }) {
  const insights = contributionInsights(rows);
  const maxContrib = Math.max(
    ...rows.map((row) => Math.abs(row.contributionEstimate)),
    1e-9,
  );

  return (
    <>
      <div className="shrink-0">
        <Table className="contribution-table w-full text-[11px]">
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="h-7 px-2 py-1 text-[10px] text-zinc-500">Ticker</TableHead>
              <TableHead className="h-7 px-2 py-1 text-right text-[10px] text-zinc-500">
                Start
              </TableHead>
              <TableHead className="h-7 px-2 py-1 text-right text-[10px] text-zinc-500">
                Current
              </TableHead>
              <TableHead className="h-7 px-2 py-1 text-right text-[10px] text-zinc-500">
                Return
              </TableHead>
              <TableHead className="h-7 px-2 py-1 text-right text-[10px] text-zinc-500">
                Weight
              </TableHead>
              <TableHead className="h-7 px-2 py-1 text-right text-[10px] text-zinc-500">
                Contrib.
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.ticker} className="border-zinc-800/80 hover:bg-zinc-800/15">
                <TableCell className="px-2 py-1.5 font-mono text-xs font-medium text-zinc-200">
                  {row.ticker}
                </TableCell>
                <TableCell className="px-2 py-1.5 text-right font-mono text-xs text-zinc-500">
                  {formatCurrency(row.startPrice)}
                </TableCell>
                <TableCell className="px-2 py-1.5 text-right font-mono text-xs text-zinc-200">
                  {formatCurrency(row.endPrice)}
                </TableCell>
                <TableCell
                  className={`px-2 py-1.5 text-right font-mono text-xs ${row.assetReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {formatPercent(row.assetReturn)}
                </TableCell>
                <TableCell className="px-2 py-1.5 text-right font-mono text-xs text-zinc-400">
                  {formatAllocation(row.currentWeight)}
                </TableCell>
                <TableCell className="px-2 py-1.5 text-right font-mono text-xs text-amber-400/90">
                  {formatPercent(row.contributionEstimate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center border-t border-zinc-800/60 pt-3">
        <p className="mb-2.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Contribution breakdown
        </p>
        <div className="flex flex-col justify-center gap-2">
          {rows.map((row) => {
            const widthPct =
              (Math.abs(row.contributionEstimate) / maxContrib) * 100;
            const isPositive = row.contributionEstimate >= 0;

            return (
              <div
                key={`bar-${row.ticker}`}
                className="grid w-full grid-cols-[44px_minmax(0,1fr)_64px] items-center gap-2"
              >
                <span
                  className="font-mono text-[10px] font-semibold"
                  style={{ color: ASSET_COLORS[row.ticker] }}
                >
                  {row.ticker}
                </span>
                <div className="h-2.5 w-full overflow-hidden rounded-sm bg-zinc-800/70">
                  <div
                    className="h-full rounded-sm transition-[width] duration-300"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: isPositive
                        ? ASSET_COLORS[row.ticker]
                        : "#f87171",
                    }}
                  />
                </div>
                <span
                  className={`text-right font-mono text-[10px] tabular-nums ${isPositive ? "text-zinc-200" : "text-red-400/90"}`}
                >
                  {formatPercent(row.contributionEstimate)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-1 border-t border-zinc-800/60 pt-2.5 text-[10px] text-zinc-500 sm:grid-cols-4">
        <span>
          Top contributor:{" "}
          <span
            className="font-mono"
            style={{ color: ASSET_COLORS[insights.topContributor.ticker] }}
          >
            {insights.topContributor.ticker}
          </span>
        </span>
        <span>
          Highest return:{" "}
          <span
            className="font-mono"
            style={{ color: ASSET_COLORS[insights.highestReturn.ticker] }}
          >
            {insights.highestReturn.ticker}
          </span>
        </span>
        <span>
          Avg contribution:{" "}
          <span className="font-mono text-zinc-300">
            {formatPercent(insights.avgContribution)}
          </span>
        </span>
        <span>
          {insights.share > 0.45 ? (
            <>
              Concentration:{" "}
              <span className="font-mono text-amber-400/90">
                {insights.topContributor.ticker} dominates (
                {formatPercent(insights.share)})
              </span>
            </>
          ) : (
            <span className="text-zinc-600">Balanced contribution mix</span>
          )}
        </span>
      </div>
    </>
  );
}

function correlationInsights(matrix: Record<Ticker, Record<Ticker, number>>) {
  let strongest: { a: Ticker; b: Ticker; v: number } = {
    a: RL_TICKERS[0],
    b: RL_TICKERS[1],
    v: -Infinity,
  };
  let weakest: { a: Ticker; b: Ticker; v: number } = {
    a: RL_TICKERS[0],
    b: RL_TICKERS[1],
    v: Infinity,
  };
  let sum = 0;
  let count = 0;

  for (let i = 0; i < RL_TICKERS.length; i++) {
    for (let j = i + 1; j < RL_TICKERS.length; j++) {
      const a = RL_TICKERS[i];
      const b = RL_TICKERS[j];
      const v = matrix[a][b];
      if (v > strongest.v) strongest = { a, b, v };
      if (v < weakest.v) weakest = { a, b, v };
      sum += v;
      count += 1;
    }
  }

  return {
    strongest,
    weakest,
    average: count > 0 ? sum / count : 0,
  };
}

function CorrelationHeatmap({
  matrix,
}: {
  matrix: Record<Ticker, Record<Ticker, number>>;
}) {
  const insights = correlationInsights(matrix);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div
          className="grid w-full max-w-full gap-1"
          style={{
            gridTemplateColumns: `52px repeat(${RL_TICKERS.length}, minmax(0, 1fr))`,
            gridTemplateRows: `auto repeat(${RL_TICKERS.length}, minmax(44px, 1fr))`,
          }}
        >
          <div className="min-h-[28px]" />
          {RL_TICKERS.map((ticker) => (
            <div
              key={`col-${ticker}`}
              className="flex min-h-[28px] items-end justify-center pb-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: ASSET_COLORS[ticker] }}
            >
              {ticker}
            </div>
          ))}

          {RL_TICKERS.map((row) => (
            <Fragment key={row}>
              <div
                className="flex items-center pr-1 font-mono text-[10px] font-semibold"
                style={{ color: ASSET_COLORS[row] }}
              >
                {row}
              </div>
              {RL_TICKERS.map((col) => {
                const value = matrix[row][col];
                const isDiagonal = row === col;
                const { background, color } = correlationHeatmapCellStyle(row, col, value);

                return (
                  <div
                    key={`${row}-${col}`}
                    className="flex min-h-[44px] items-center justify-center rounded-sm border font-mono text-xs tabular-nums transition-colors"
                    style={{
                      background,
                      color,
                      borderColor: isDiagonal
                        ? `${ASSET_COLORS[row]}55`
                        : "rgba(63, 63, 70, 0.45)",
                    }}
                    title={`${row} ↔ ${col}: ${value.toFixed(3)}`}
                  >
                    <span className={isDiagonal ? "font-semibold" : "font-medium"}>
                      {value.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-t border-zinc-800/60 pt-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {RL_TICKERS.map((ticker) => (
            <span
              key={ticker}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] text-zinc-400"
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: ASSET_COLORS[ticker] }}
              />
              {ticker}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          <span className="shrink-0">Weaker</span>
          <div
            className="h-1.5 min-w-0 flex-1 rounded-full"
            style={{
              background: `linear-gradient(90deg, #11151a 0%, ${ASSET_COLORS.AAPL}55 22%, ${ASSET_COLORS.MSFT}77 44%, ${ASSET_COLORS.GOOGL}88 66%, ${ASSET_COLORS.NVDA}bb 100%)`,
            }}
          />
          <span className="shrink-0">Stronger</span>
        </div>
        <p className="text-[10px] leading-snug text-zinc-500">
          Strongest:{" "}
          <span className="font-mono text-zinc-300">
            {insights.strongest.a} ↔ {insights.strongest.b} ({insights.strongest.v.toFixed(2)})
          </span>
          <span className="mx-1.5 text-zinc-700">·</span>
          Weakest:{" "}
          <span className="font-mono text-zinc-300">
            {insights.weakest.a} ↔ {insights.weakest.b} ({insights.weakest.v.toFixed(2)})
          </span>
          <span className="mx-1.5 text-zinc-700">·</span>
          Avg pairwise:{" "}
          <span className="font-mono text-zinc-300">{insights.average.toFixed(2)}</span>
        </p>
      </div>
    </div>
  );
}
