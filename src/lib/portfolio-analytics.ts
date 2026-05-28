import { RL_TICKERS } from "@/lib/constants";
import { computeReturn } from "@/lib/format";
import type { AllocationWeights, Ticker } from "@/types/rl-trading";
import type { MarketDataRow } from "@/lib/market-csv";

export interface DrawdownPoint {
  index: number;
  value: number;
  date?: string;
}

export interface DrawdownStats {
  series: DrawdownPoint[];
  maxDrawdown: number;
  maxDrawdownIndex: number;
  currentDrawdown: number;
  worstDate?: string;
}

export interface ReturnDistribution {
  bins: { label: string; count: number; mid: number }[];
  averageReturn: number;
  positivePct: number;
  negativePct: number;
  bestPeriod: number;
  worstPeriod: number;
}

export interface RiskMetrics {
  volatility: number;
  downsideVolatility: number;
  positivePeriodRatio: number;
  bestPeriod: number;
  worstPeriod: number;
  maxDrawdown: number;
}

export interface TickerReturnRow {
  ticker: Ticker;
  startPrice: number;
  endPrice: number;
  assetReturn: number;
  currentWeight: number;
  contributionEstimate: number;
}

export interface AllocationDriftRow {
  ticker: Ticker;
  current: number;
  target: number;
  ppoTarget: number;
  delta: number;
  status: "Increase" | "Reduce" | "Hold";
}

export interface HoldingRow {
  ticker: Ticker;
  price: number;
  shares: number;
  currentWeight: number;
  targetWeight: number;
  ppoTargetWeight: number;
  delta: number;
  notional: number;
  signal: string;
}

export function calculateTotalReturn(history: number[]): number {
  return computeReturn(history);
}

export function calculateAlpha(agentHistory: number[], benchmarkHistory: number[]): number {
  return calculateTotalReturn(agentHistory) - calculateTotalReturn(benchmarkHistory);
}

export function calculateReturnSeries(history: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    out.push(prev === 0 ? 0 : (history[i] - prev) / prev);
  }
  return out;
}

export function calculateVolatility(history: number[]): number {
  const returns = calculateReturnSeries(history);
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(Math.max(0, variance));
}

export function calculateDownsideVolatility(history: number[]): number {
  const returns = calculateReturnSeries(history);
  const negative = returns.filter((r) => r < 0);
  if (negative.length < 2) return 0;
  const mean = negative.reduce((a, b) => a + b, 0) / negative.length;
  const variance =
    negative.reduce((s, r) => s + (r - mean) ** 2, 0) / (negative.length - 1);
  return Math.sqrt(Math.max(0, variance));
}

export function calculateDrawdownSeries(
  history: number[],
  dates?: string[],
): DrawdownPoint[] {
  let peak = history[0] ?? 0;
  return history.map((v, index) => {
    if (v > peak) peak = v;
    const value = peak > 0 ? (v - peak) / peak : 0;
    return { index, value, date: dates?.[index] };
  });
}

export function calculateMaxDrawdown(
  history: number[],
  dates?: string[],
): DrawdownStats {
  const series = calculateDrawdownSeries(history, dates);
  let maxDrawdown = 0;
  let maxDrawdownIndex = 0;
  for (const p of series) {
    if (p.value < maxDrawdown) {
      maxDrawdown = p.value;
      maxDrawdownIndex = p.index;
    }
  }
  const currentDrawdown = series[series.length - 1]?.value ?? 0;
  return {
    series,
    maxDrawdown,
    maxDrawdownIndex,
    currentDrawdown,
    worstDate: dates?.[maxDrawdownIndex],
  };
}

export function calculatePositivePeriodRatio(history: number[]): number {
  const returns = calculateReturnSeries(history);
  if (returns.length === 0) return 0;
  const positive = returns.filter((r) => r > 0).length;
  return positive / returns.length;
}

export function calculateReturnDistribution(history: number[]): ReturnDistribution {
  const returns = calculateReturnSeries(history);
  if (returns.length === 0) {
    return {
      bins: [],
      averageReturn: 0,
      positivePct: 0,
      negativePct: 0,
      bestPeriod: 0,
      worstPeriod: 0,
    };
  }

  const min = Math.min(...returns);
  const max = Math.max(...returns);
  const binCount = 12;
  const span = max - min || 0.01;
  const step = span / binCount;

  const bins = Array.from({ length: binCount }, (_, i) => {
    const lo = min + i * step;
    const hi = lo + step;
    const mid = (lo + hi) / 2;
    const count = returns.filter((r) =>
      i === binCount - 1 ? r >= lo && r <= hi : r >= lo && r < hi,
    ).length;
    return {
      label: `${(mid * 100).toFixed(1)}%`,
      count,
      mid,
    };
  });

  const positive = returns.filter((r) => r > 0).length;
  const negative = returns.filter((r) => r < 0).length;

  return {
    bins,
    averageReturn: returns.reduce((a, b) => a + b, 0) / returns.length,
    positivePct: positive / returns.length,
    negativePct: negative / returns.length,
    bestPeriod: Math.max(...returns),
    worstPeriod: Math.min(...returns),
  };
}

export function calculateRiskMetrics(
  agentHistory: number[],
  dates?: string[],
): RiskMetrics {
  const returns = calculateReturnSeries(agentHistory);
  const dd = calculateMaxDrawdown(agentHistory, dates);
  return {
    volatility: calculateVolatility(agentHistory),
    downsideVolatility: calculateDownsideVolatility(agentHistory),
    positivePeriodRatio: calculatePositivePeriodRatio(agentHistory),
    bestPeriod: returns.length ? Math.max(...returns) : 0,
    worstPeriod: returns.length ? Math.min(...returns) : 0,
    maxDrawdown: dd.maxDrawdown,
  };
}

export function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  const meanA = a.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const meanB = b.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  if (den === 0) return 0;
  return Math.max(-1, Math.min(1, num / den));
}

export function calculateTickerReturnSeries(rows: MarketDataRow[], ticker: Ticker): number[] {
  const prices = rows.map((r) => r.prices[ticker]);
  return calculateReturnSeries(prices);
}

export function calculateCorrelationMatrix(
  rows: MarketDataRow[],
): Record<Ticker, Record<Ticker, number>> {
  const series = Object.fromEntries(
    RL_TICKERS.map((t) => [t, calculateTickerReturnSeries(rows, t)]),
  ) as Record<Ticker, number[]>;

  const matrix = {} as Record<Ticker, Record<Ticker, number>>;
  for (const t1 of RL_TICKERS) {
    matrix[t1] = {} as Record<Ticker, number>;
    for (const t2 of RL_TICKERS) {
      matrix[t1][t2] = t1 === t2 ? 1 : pearsonCorrelation(series[t1], series[t2]);
    }
  }
  return matrix;
}

export function calculateTickerReturns(
  rows: MarketDataRow[],
  startIndex: number,
  endIndex: number,
  currentWeights: AllocationWeights,
): TickerReturnRow[] {
  const start = Math.max(0, startIndex);
  const end = Math.min(rows.length - 1, endIndex);
  const startRow = rows[start];
  const endRow = rows[end];
  if (!startRow || !endRow) return [];

  return RL_TICKERS.map((ticker) => {
    const startPrice = startRow.prices[ticker];
    const endPrice = endRow.prices[ticker];
    const assetReturn =
      startPrice > 0 ? (endPrice - startPrice) / startPrice : 0;
    const currentWeight = currentWeights[ticker] ?? 0;
    return {
      ticker,
      startPrice,
      endPrice,
      assetReturn,
      currentWeight,
      contributionEstimate: currentWeight * assetReturn,
    };
  });
}

export function calculateAllocationDrift(
  current: AllocationWeights,
  adjustedTarget: number[],
  ppoTarget: number[],
): AllocationDriftRow[] {
  return RL_TICKERS.map((ticker, i) => {
    const cur = current[ticker] ?? 0;
    const tgt = adjustedTarget[i] ?? 0;
    const ppo = ppoTarget[i] ?? tgt;
    const delta = tgt - cur;
    let status: AllocationDriftRow["status"] = "Hold";
    if (delta > 0.03) status = "Increase";
    else if (delta < -0.03) status = "Reduce";
    return { ticker, current: cur, target: tgt, ppoTarget: ppo, delta, status };
  });
}

export function topConcentration(weights: AllocationWeights): {
  ticker: Ticker;
  weight: number;
} {
  let best: Ticker = "AAPL";
  let max = 0;
  for (const t of RL_TICKERS) {
    const w = weights[t] ?? 0;
    if (w > max) {
      max = w;
      best = t;
    }
  }
  return { ticker: best, weight: max };
}

export function buildHoldingsRows(
  portfolioValue: number,
  prices: Record<Ticker, number>,
  current: AllocationWeights,
  adjustedTarget: number[],
  ppoTarget: number[],
): HoldingRow[] {
  return RL_TICKERS.map((ticker, i) => {
    const price = prices[ticker] ?? 0;
    const currentWeight = current[ticker] ?? 0;
    const targetWeight = adjustedTarget[i] ?? 0;
    const ppoTargetWeight = ppoTarget[i] ?? targetWeight;
    const delta = targetWeight - currentWeight;
    const notional = portfolioValue * currentWeight;
    const shares = price > 0 ? notional / price : 0;
    let signal = "Hold";
    if (delta > 0.03) signal = "Increase";
    else if (delta < -0.03) signal = "Reduce";
    return {
      ticker,
      price,
      shares,
      currentWeight,
      targetWeight,
      ppoTargetWeight,
      delta,
      notional,
      signal,
    };
  });
}

export function cashWeight(current: AllocationWeights): number {
  const invested = RL_TICKERS.reduce((s, t) => s + (current[t] ?? 0), 0);
  return Math.max(0, 1 - invested);
}
