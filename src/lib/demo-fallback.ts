import { readFileSync } from "fs";
import path from "path";

import { INITIAL_BALANCE, RL_TICKERS, TRANSACTION_COST } from "@/lib/constants";
import type {
  AllocationWeights,
  DashboardData,
  PriceHistoryPoint,
  Ticker,
} from "@/types/rl-trading";

function parseCsvPrices(): PriceHistoryPoint[] {
  const csvPath = path.join(process.cwd(), "data", "sp500.csv");
  const raw = readFileSync(csvPath, "utf-8");
  const lines = raw.trim().split("\n");
  const header = lines[0].split(",");
  const dateIdx = header.indexOf("Date");

  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row: Record<string, string | number> = {
      Date: cols[dateIdx],
    };
    for (const ticker of RL_TICKERS) {
      const idx = header.indexOf(ticker);
      row[ticker] = Number.parseFloat(cols[idx]);
    }
    return row as unknown as PriceHistoryPoint;
  });
}

function computeBenchmarkHistory(prices: PriceHistoryPoint[]): number[] {
  const first = prices[0];
  const firstPrices = RL_TICKERS.map((t) => first[t]);
  const dollarsPerStock = INITIAL_BALANCE / RL_TICKERS.length;
  const sharesPerStock = firstPrices.map((p) => dollarsPerStock / p);

  return prices.map((row) => {
    const currentPrices = RL_TICKERS.map((t) => row[t]);
    return currentPrices.reduce((sum, p, i) => sum + p * sharesPerStock[i], 0);
  });
}

/** Equal-weight monthly rebalance — demo only, not live PPO. */
function computeDemoAgentHistory(prices: PriceHistoryPoint[]): number[] {
  let balance = INITIAL_BALANCE;
  const shares = RL_TICKERS.map(() => 0);
  let portfolioValue = INITIAL_BALANCE;
  const history = [INITIAL_BALANCE];
  const targetWeight = 1 / RL_TICKERS.length;

  for (let i = 0; i < prices.length - 1; i++) {
    const currentPrices = RL_TICKERS.map((t) => prices[i][t]);
    portfolioValue = balance + shares.reduce((s, sh, idx) => s + sh * currentPrices[idx], 0);

    const targetDollars = portfolioValue * targetWeight;
    const targetShares = currentPrices.map((p) => targetDollars / p);
    const sharesToTrade = targetShares.map((ts, idx) => ts - shares[idx]);
    const tradeValue = sharesToTrade.reduce((s, st, idx) => s + st * currentPrices[idx], 0);
    const fees = TRANSACTION_COST * Math.abs(tradeValue);

    balance -= tradeValue + fees;
    for (let j = 0; j < shares.length; j++) shares[j] = targetShares[j];

    const nextPrices = RL_TICKERS.map((t) => prices[i + 1][t]);
    portfolioValue = balance + shares.reduce((s, sh, idx) => s + sh * nextPrices[idx], 0);
    history.push(portfolioValue);
  }

  return history;
}

function equalAllocation(): AllocationWeights {
  const w = 1 / RL_TICKERS.length;
  return {
    AAPL: w,
    MSFT: w,
    GOOGL: w,
    AMZN: w,
    NVDA: w,
  };
}

export function buildDemoDashboardData(): DashboardData {
  const price_history = parseCsvPrices();
  const agent_history = computeDemoAgentHistory(price_history);
  const benchmark_history = computeBenchmarkHistory(price_history);

  return {
    tickers: [...RL_TICKERS] as Ticker[],
    data_source: "demo_local",
    initial_balance: INITIAL_BALANCE,
    transaction_cost: TRANSACTION_COST,
    current_allocation: equalAllocation(),
    agent_history,
    benchmark_history,
    price_history,
  };
}

export function buildDemoPrediction(observation: number[]) {
  const equal = RL_TICKERS.map(() => 0);
  const allocations = RL_TICKERS.map(() => 1 / RL_TICKERS.length);
  return {
    raw_action: equal,
    allocations,
    observation,
  };
}
