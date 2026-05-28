import { RL_TICKERS } from "@/lib/constants";
import { priceChangePct } from "@/lib/dashboard-math";
import {
  ALLOCATION_DELTA_THRESHOLD,
  deriveTickerSignals,
  type TickerBias,
  type TickerSignalRow,
} from "@/lib/signal-engine";
import type { DashboardData, PriceHistoryPoint, Ticker } from "@/types/rl-trading";

export type TrendLabel = "Up" | "Down" | "Flat";

export interface MarketWatchRow extends TickerSignalRow {
  price: number;
  changePct: number;
  trend: TrendLabel;
}

export interface MarketSummary {
  strongest: { ticker: Ticker; changePct: number };
  weakest: { ticker: Ticker; changePct: number };
  highestTarget: { ticker: Ticker; weight: number };
  largestDelta: { ticker: Ticker; delta: number };
  buyBiasCount: number;
  sellBiasCount: number;
  holdCount: number;
  averageMove: number;
}

export interface NormalizedPricePoint {
  i: number;
  date: string;
  AAPL: number;
  MSFT: number;
  GOOGL: number;
  AMZN: number;
  NVDA: number;
}

export function trendFromChange(chg: number): TrendLabel {
  if (chg > 0.02) return "Up";
  if (chg < -0.02) return "Down";
  return "Flat";
}

export function buildMarketWatchRows(
  data: DashboardData,
  targets: number[],
  barIndex: number,
  lookback = 5,
): MarketWatchRow[] {
  const signals = deriveTickerSignals(data.current_allocation, targets);
  const bar = data.price_history[barIndex];
  if (!bar) {
    return signals.map((row) => ({
      ...row,
      price: 0,
      changePct: 0,
      trend: "Flat" as const,
    }));
  }

  return signals.map((row) => {
    const changePct = priceChangePct(data, row.ticker, lookback, barIndex);
    return {
      ...row,
      price: bar[row.ticker],
      changePct,
      trend: trendFromChange(changePct),
    };
  });
}

export function summarizeMarketWatch(rows: MarketWatchRow[]): MarketSummary {
  if (rows.length === 0) {
    return {
      strongest: { ticker: "AAPL", changePct: 0 },
      weakest: { ticker: "AAPL", changePct: 0 },
      highestTarget: { ticker: "AAPL", weight: 0 },
      largestDelta: { ticker: "AAPL", delta: 0 },
      buyBiasCount: 0,
      sellBiasCount: 0,
      holdCount: 0,
      averageMove: 0,
    };
  }

  const strongest = rows.reduce((best, row) =>
    row.changePct > best.changePct ? row : best,
  );
  const weakest = rows.reduce((best, row) =>
    row.changePct < best.changePct ? row : best,
  );
  const highestTarget = rows.reduce((best, row) =>
    row.target > best.target ? row : best,
  );
  const largestDelta = rows.reduce((best, row) =>
    Math.abs(row.delta) > Math.abs(best.delta) ? row : best,
  );

  return {
    strongest: { ticker: strongest.ticker, changePct: strongest.changePct },
    weakest: { ticker: weakest.ticker, changePct: weakest.changePct },
    highestTarget: { ticker: highestTarget.ticker, weight: highestTarget.target },
    largestDelta: { ticker: largestDelta.ticker, delta: largestDelta.delta },
    buyBiasCount: rows.filter((r) => r.bias === "Increase").length,
    sellBiasCount: rows.filter((r) => r.bias === "Reduce").length,
    holdCount: rows.filter((r) => r.bias === "Hold").length,
    averageMove:
      rows.length > 0
        ? rows.reduce((s, r) => s + Math.abs(r.changePct), 0) / rows.length
        : 0,
  };
}

export function calculateNormalizedPriceSeries(
  priceHistory: PriceHistoryPoint[],
  endIndex?: number,
  maxPoints = 180,
): NormalizedPricePoint[] {
  if (priceHistory.length === 0) return [];

  const end = endIndex ?? priceHistory.length - 1;
  const startIdx = Math.max(0, end - maxPoints + 1);
  const slice = priceHistory.slice(startIdx, end + 1);
  if (slice.length === 0) return [];

  const bases = Object.fromEntries(
    RL_TICKERS.map((t) => [t, slice[0][t] || 1]),
  ) as Record<Ticker, number>;

  return slice.map((point, offset) => {
    const row: NormalizedPricePoint = {
      i: startIdx + offset,
      date: point.Date,
      AAPL: 100,
      MSFT: 100,
      GOOGL: 100,
      AMZN: 100,
      NVDA: 100,
    };
    for (const ticker of RL_TICKERS) {
      const base = bases[ticker];
      row[ticker] = base > 0 ? (point[ticker] / base) * 100 : 100;
    }
    return row;
  });
}

export function classifySignal(delta: number): TickerBias {
  if (delta > ALLOCATION_DELTA_THRESHOLD) return "Increase";
  if (delta < -ALLOCATION_DELTA_THRESHOLD) return "Reduce";
  return "Hold";
}

export function dataSourceDisplayLabel(source: string): string {
  switch (source) {
    case "stooq_historical":
      return "Stooq Historical";
    case "csv_fallback":
      return "CSV Fallback";
    case "yfinance":
      return "yfinance";
    case "demo_local":
      return "Demo Local";
    case "synthetic":
      return "Synthetic";
    default:
      return source;
  }
}
