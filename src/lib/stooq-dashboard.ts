import { INITIAL_BALANCE, TRANSACTION_COST } from "@/lib/constants";
import { loadMarketData, marketPricesFileExists } from "@/lib/market-csv";
import { runPpoBacktest } from "@/lib/ppo/backtest";
import type { DashboardData } from "@/types/rl-trading";

export const MARKET_DATA_MISSING_MESSAGE =
  "Historical market data not found. Run npm run data:stooq.";

export { marketPricesFileExists, loadMarketData };

/** Cache the backtest per starting cash — the policy is deterministic, so the
 *  curves only change when the underlying market CSV does. */
const backtestCache = new Map<string, DashboardData>();

export async function buildStooqDashboardData(
  startingCash = INITIAL_BALANCE,
): Promise<DashboardData | null> {
  const { rows, dataSource } = await loadMarketData();
  if (rows.length === 0) return null;

  const cacheKey = `${startingCash}:${dataSource}:${rows.length}:${rows[rows.length - 1].date}`;
  const cached = backtestCache.get(cacheKey);
  if (cached) return cached;

  const backtest = runPpoBacktest(rows, startingCash);

  const data: DashboardData = {
    tickers: ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"],
    data_source: dataSource,
    initial_balance: startingCash,
    transaction_cost: TRANSACTION_COST,
    current_allocation: backtest.current_allocation,
    agent_history: backtest.agent_history,
    benchmark_history: backtest.benchmark_history,
    price_history: backtest.price_history,
  };

  backtestCache.set(cacheKey, data);
  return data;
}
