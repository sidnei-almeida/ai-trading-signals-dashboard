import { RL_TICKERS } from "@/lib/constants";
import type { PriceHistoryPoint } from "@/types/rl-trading";

/** Parse `Date,AAPL,MSFT,...` wide-format CSV (deep-rl-trading-agent data_fallback). */
export function parseSp500CsvRaw(raw: string): PriceHistoryPoint[] {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim());
  const dateIdx = header.indexOf("Date");
  if (dateIdx < 0) return [];

  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row: Record<string, string | number> = {
      Date: cols[dateIdx]?.trim() ?? "",
    };
    for (const ticker of RL_TICKERS) {
      const idx = header.indexOf(ticker);
      row[ticker] = Number.parseFloat(cols[idx] ?? "");
    }
    return row as unknown as PriceHistoryPoint;
  });
}
