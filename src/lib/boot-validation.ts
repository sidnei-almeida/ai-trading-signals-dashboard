import { RL_TICKERS } from "@/lib/constants";
import type { MarketDataPayload } from "@/lib/market-csv";
import type { DashboardData, Ticker } from "@/types/rl-trading";

export function validateMarketPayload(payload: MarketDataPayload): void {
  if (!payload.rows.length) {
    throw new Error(
      "Historical market data not found. Run npm run data:stooq or verify MARKET_DATA_SP500_CSV_URL.",
    );
  }

  const sample = payload.rows[0];
  for (const ticker of RL_TICKERS) {
    if (!payload.tickers.includes(ticker as Ticker)) {
      throw new Error(`Missing ticker in market data: ${ticker}`);
    }
    const price = sample.prices[ticker as Ticker];
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Invalid close price for ${ticker} in market replay data.`);
    }
  }

  const last = payload.rows[payload.rows.length - 1];
  for (const ticker of RL_TICKERS) {
    const price = last.prices[ticker as Ticker];
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Invalid trailing close for ${ticker}.`);
    }
  }
}

export function validateDashboardBaseline(data: DashboardData): void {
  if (data.agent_history.length < 2) {
    throw new Error("Portfolio history too short to initialize replay.");
  }
  if (data.benchmark_history.length < 2) {
    throw new Error("Benchmark history too short to initialize replay.");
  }
  if (data.price_history.length < 2) {
    throw new Error("Price history too short to initialize dashboard.");
  }

  for (const ticker of RL_TICKERS) {
    const w = data.current_allocation[ticker];
    if (!Number.isFinite(w)) {
      throw new Error(`Invalid allocation weight for ${ticker}.`);
    }
  }
}
