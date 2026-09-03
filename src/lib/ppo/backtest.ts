/**
 * Full-history PPO backtest, run in-process.
 *
 * This replaces the `/api/v1/dashboard-data` endpoint of the old
 * deep-rl-trading-agent FastAPI service. The trade mechanics below mirror that
 * service's loop (and the training env's `step`) exactly so the curves stay
 * comparable to the ones the hosted API used to return:
 *
 *   1. observe `[cash, shares, prices]` at day i
 *   2. softmax the policy output into target portfolio weights
 *   3. rebalance to those weights at day i's close, paying `TRANSACTION_COST`
 *      on the absolute traded notional
 *   4. mark the book to day i+1's close
 */

import { INITIAL_BALANCE, RL_TICKERS, TRANSACTION_COST } from "@/lib/constants";
import { runPolicy } from "@/lib/ppo/policy";
import type { AllocationWeights, PriceHistoryPoint, Ticker } from "@/types/rl-trading";

/**
 * Minimum a bar needs for the simulation: a date and one close per ticker.
 * Both `MarketDataRow` (CSV) and the pivoted Postgres rows satisfy this.
 */
export interface BacktestBar {
  date: string;
  prices: Record<Ticker, number>;
}

export interface PpoBacktestResult {
  agent_history: number[];
  benchmark_history: number[];
  price_history: PriceHistoryPoint[];
  /** Softmax weights the policy produced on the final simulated day. */
  current_allocation: AllocationWeights;
  /** Cash and share counts at the end of the run. */
  finalCash: number;
  finalShares: Record<Ticker, number>;
  steps: number;
}

function equalAllocation(): AllocationWeights {
  const w = 1 / RL_TICKERS.length;
  return { AAPL: w, MSFT: w, GOOGL: w, AMZN: w, NVDA: w };
}

function pricesVector(row: BacktestBar): number[] {
  return RL_TICKERS.map((t) => row.prices[t]);
}

function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function weightsToAllocation(weights: number[]): AllocationWeights {
  const out = {} as AllocationWeights;
  RL_TICKERS.forEach((t, i) => {
    out[t] = weights[i] ?? 0;
  });
  return out;
}

function toPriceHistory(rows: BacktestBar[]): PriceHistoryPoint[] {
  return rows.map((r) => ({
    Date: r.date,
    AAPL: r.prices.AAPL,
    MSFT: r.prices.MSFT,
    GOOGL: r.prices.GOOGL,
    AMZN: r.prices.AMZN,
    NVDA: r.prices.NVDA,
  }));
}

/** Equal-weight buy & hold marked daily — the benchmark curve. */
function benchmarkHistory(rows: BacktestBar[], startingCash: number): number[] {
  const firstPrices = pricesVector(rows[0]);
  const dollarsPerStock = startingCash / RL_TICKERS.length;
  const sharesPerStock = firstPrices.map((p) => dollarsPerStock / p);
  return rows.map((row) => dot(sharesPerStock, pricesVector(row)));
}

export function runPpoBacktest(
  rows: BacktestBar[],
  startingCash: number = INITIAL_BALANCE,
): PpoBacktestResult {
  if (rows.length < 2) {
    return {
      agent_history: rows.length === 1 ? [startingCash] : [],
      benchmark_history: rows.length === 1 ? [startingCash] : [],
      price_history: toPriceHistory(rows),
      current_allocation: equalAllocation(),
      finalCash: startingCash,
      finalShares: { AAPL: 0, MSFT: 0, GOOGL: 0, AMZN: 0, NVDA: 0 },
      steps: 0,
    };
  }

  let cash = startingCash;
  let shares = RL_TICKERS.map(() => 0);
  let portfolioValue = startingCash;

  const agent_history: number[] = [startingCash];
  let lastWeights: number[] | null = null;

  for (let i = 0; i < rows.length - 1; i++) {
    const prices = pricesVector(rows[i]);
    const observation = [cash, ...shares, ...prices];

    const { allocations } = runPolicy(observation);
    lastWeights = allocations;

    const targetShares = prices.map((p, k) => (portfolioValue * allocations[k]) / p);
    const sharesToTrade = targetShares.map((ts, k) => ts - shares[k]);
    const tradeValue = dot(sharesToTrade, prices);
    const fees = TRANSACTION_COST * Math.abs(tradeValue);

    cash -= tradeValue + fees;
    shares = targetShares;

    portfolioValue = cash + dot(shares, pricesVector(rows[i + 1]));
    agent_history.push(portfolioValue);
  }

  const finalShares = {} as Record<Ticker, number>;
  RL_TICKERS.forEach((t, i) => {
    finalShares[t] = shares[i];
  });

  return {
    agent_history,
    benchmark_history: benchmarkHistory(rows, startingCash),
    price_history: toPriceHistory(rows),
    current_allocation: lastWeights ? weightsToAllocation(lastWeights) : equalAllocation(),
    finalCash: cash,
    finalShares,
    steps: rows.length - 1,
  };
}
