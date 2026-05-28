import { INITIAL_BALANCE, TRANSACTION_COST } from "@/lib/constants";
import { loadMarketData, marketPricesFileExists } from "@/lib/market-csv";
import { simulateStaticHistory } from "@/lib/stooq-replay";
import type { DashboardData } from "@/types/rl-trading";

export const MARKET_DATA_MISSING_MESSAGE =
  "Historical market data not found. Run npm run data:stooq.";

export { marketPricesFileExists, loadMarketData };

export async function buildStooqDashboardData(
  startingCash = INITIAL_BALANCE,
): Promise<DashboardData | null> {
  const { rows } = await loadMarketData();
  if (rows.length === 0) return null;

  const simulated = simulateStaticHistory(rows, startingCash);

  return {
    tickers: ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"],
    data_source: "stooq_historical",
    initial_balance: startingCash,
    transaction_cost: TRANSACTION_COST,
    current_allocation: simulated.finalPortfolio.allocation,
    agent_history: simulated.agent_history,
    benchmark_history: simulated.benchmark_history,
    price_history: simulated.price_history,
  };
}
