import { existsSync, readFileSync } from "fs";
import path from "path";

import { INITIAL_BALANCE, RL_TICKERS, TRANSACTION_COST } from "@/lib/constants";
import { fetchRemoteSp500Prices } from "@/lib/remote-data";
import { parseSp500CsvRaw } from "@/lib/sp500-csv";
import type {
  AllocationWeights,
  DashboardData,
  PriceHistoryPoint,
  Ticker,
} from "@/types/rl-trading";

let cachedDemoPrices: PriceHistoryPoint[] | null = null;

async function loadDemoPrices(): Promise<PriceHistoryPoint[]> {
  if (cachedDemoPrices) return cachedDemoPrices;

  const csvPath = path.join(process.cwd(), "data", "sp500.csv");
  try {
    if (existsSync(csvPath)) {
      cachedDemoPrices = parseSp500CsvRaw(readFileSync(csvPath, "utf-8"));
      return cachedDemoPrices;
    }
  } catch {
    /* try remote */
  }

  cachedDemoPrices = await fetchRemoteSp500Prices();
  return cachedDemoPrices;
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

export async function buildDemoDashboardData(): Promise<DashboardData> {
  const price_history = await loadDemoPrices();
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
