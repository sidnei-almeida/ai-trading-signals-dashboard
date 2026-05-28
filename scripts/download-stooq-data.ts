/**
 * Download Stooq historical daily CSVs for the PPO ticker universe.
 *
 * Usage:
 *   npm run data:stooq
 *
 * Optional env:
 *   STOOQ_API_KEY — from https://stooq.com/q/d/?s=aapl.us&get_apikey (captcha)
 *   STOOQ_START_DATE — YYYYMMDD (default 20200101)
 *   STOOQ_END_DATE — YYYYMMDD (default today)
 *
 * Output:
 *   data/market/{aapl,msft,googl,amzn,nvda}.csv
 *   data/market/prices.csv (aligned OHLCV)
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import {
  MARKET_DIR,
  parseStooqTickerCsv,
  type OhlcvBar,
} from "../src/lib/market-csv";

const TICKERS = [
  { symbol: "aapl.us", file: "aapl.csv", key: "aapl" },
  { symbol: "msft.us", file: "msft.csv", key: "msft" },
  { symbol: "googl.us", file: "googl.csv", key: "googl" },
  { symbol: "amzn.us", file: "amzn.csv", key: "amzn" },
  { symbol: "nvda.us", file: "nvda.csv", key: "nvda" },
] as const;

function formatTodayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function buildStooqUrl(symbol: string, d1: string, d2: string, apiKey?: string): string {
  const params = new URLSearchParams({
    s: symbol,
    d1,
    d2,
    i: "d",
  });
  if (apiKey) params.set("apikey", apiKey);
  return `https://stooq.com/q/d/l/?${params.toString()}`;
}

async function fetchTickerCsv(
  symbol: string,
  d1: string,
  d2: string,
  apiKey?: string,
): Promise<string> {
  const url = buildStooqUrl(symbol, d1, d2, apiKey);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Stooq HTTP ${res.status} for ${symbol}`);
  }
  const text = await res.text();
  if (
    text.includes("Get your apikey") ||
    text.toLowerCase().includes("captcha") ||
    text.includes("error.txt")
  ) {
    throw new Error(
      `Stooq rejected download for ${symbol}. Set STOOQ_API_KEY (see https://stooq.com/q/d/?s=${symbol}&get_apikey).`,
    );
  }
  if (!text.trim().toLowerCase().startsWith("date,")) {
    throw new Error(`Unexpected Stooq response for ${symbol}: ${text.slice(0, 120)}`);
  }
  return text;
}

function alignTickerMaps(maps: Map<string, OhlcvBar>[]): string[] {
  const keys = maps.map((m) => new Set(m.keys()));
  let common = keys[0];
  for (let i = 1; i < keys.length; i++) {
    common = new Set([...common].filter((d) => keys[i].has(d)));
  }
  return [...common].sort((a, b) => a.localeCompare(b));
}

function writeCombinedCsv(
  dates: string[],
  byTicker: Map<string, Map<string, OhlcvBar>>,
): string {
  const header = [
    "date",
    ...TICKERS.flatMap((t) => [
      `${t.key}_open`,
      `${t.key}_high`,
      `${t.key}_low`,
      `${t.key}_close`,
      `${t.key}_volume`,
    ]),
  ].join(",");

  const lines = dates.map((date) => {
    const cols = [date];
    for (const t of TICKERS) {
      const bar = byTicker.get(t.key)?.get(date);
      if (!bar) throw new Error(`Missing ${t.key} on ${date}`);
      cols.push(
        String(bar.open),
        String(bar.high),
        String(bar.low),
        String(bar.close),
        String(bar.volume),
      );
    }
    return cols.join(",");
  });

  return [header, ...lines].join("\n") + "\n";
}

async function main(): Promise<void> {
  const apiKey = process.env.STOOQ_API_KEY?.trim() || undefined;
  const d1 = process.env.STOOQ_START_DATE ?? "20200101";
  const d2 = process.env.STOOQ_END_DATE ?? formatTodayYmd();

  mkdirSync(MARKET_DIR, { recursive: true });

  console.log(`Stooq download ${d1} → ${d2}${apiKey ? " (apikey set)" : " (no apikey — may fail)"}`);

  const byTicker = new Map<string, Map<string, OhlcvBar>>();

  for (const t of TICKERS) {
    process.stdout.write(`  ${t.symbol}… `);
    let raw = await fetchTickerCsv(t.symbol, d1, d2, apiKey);

    if (!apiKey && raw.includes("Get your apikey")) {
      raw = await fetchTickerCsv(t.symbol, d1, d2);
    }

    const parsed = parseStooqTickerCsv(raw);
    if (parsed.size === 0) {
      throw new Error(`No rows parsed for ${t.symbol}`);
    }

    const outPath = path.join(MARKET_DIR, t.file);
    writeFileSync(outPath, raw, "utf-8");
    byTicker.set(t.key, parsed);
    console.log(`${parsed.size} rows → ${outPath}`);
  }

  const dates = alignTickerMaps(TICKERS.map((t) => byTicker.get(t.key)!));

  if (dates.length === 0) {
    throw new Error("No aligned dates across tickers.");
  }

  const combined = writeCombinedCsv(dates, byTicker);
  const pricesPath = path.join(MARKET_DIR, "prices.csv");
  writeFileSync(pricesPath, combined, "utf-8");

  console.log(`\nAligned ${dates.length} trading days → ${pricesPath}`);
  console.log(`Range: ${dates[0]} … ${dates[dates.length - 1]}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
