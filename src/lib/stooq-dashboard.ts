import { loadMarketData, marketPricesFileExists } from "@/lib/market-csv";

export const MARKET_DATA_MISSING_MESSAGE =
  "Historical market data not found. Run npm run data:stooq.";

export { marketPricesFileExists, loadMarketData };
