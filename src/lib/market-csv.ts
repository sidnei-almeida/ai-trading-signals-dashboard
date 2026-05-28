import { existsSync, readFileSync } from "fs";
import path from "path";

import { RL_TICKERS } from "@/lib/constants";
import { fetchRemoteSp500Prices } from "@/lib/remote-data";
import type { PriceHistoryPoint, Ticker } from "@/types/rl-trading";

export const MARKET_DIR = path.join(process.cwd(), "data", "market");
export const PRICES_CSV_PATH = path.join(MARKET_DIR, "prices.csv");

const TICKER_KEYS: Record<Ticker, string> = {
  AAPL: "aapl",
  MSFT: "msft",
  GOOGL: "googl",
  AMZN: "amzn",
  NVDA: "nvda",
};

export interface OhlcvBar {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataRow {
  date: string;
  prices: Record<Ticker, number>;
  ohlcv: Record<Ticker, OhlcvBar>;
}

export interface MarketDataPayload {
  source: string;
  tickers: Ticker[];
  rows: MarketDataRow[];
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function parseNumber(value: string | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }
  return null;
}

export function marketPricesFileExists(): boolean {
  return existsSync(PRICES_CSV_PATH);
}

/** Parse Stooq per-ticker CSV (Date,Open,High,Low,Close,Volume). */
export function parseStooqTickerCsv(raw: string): Map<string, OhlcvBar> {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return new Map();

  const header = lines[0].split(",").map(normalizeHeader);
  const dateIdx = header.indexOf("date");
  const openIdx = header.indexOf("open");
  const highIdx = header.indexOf("high");
  const lowIdx = header.indexOf("low");
  const closeIdx = header.indexOf("close");
  const volumeIdx = header.indexOf("volume");

  if (dateIdx < 0 || closeIdx < 0) return new Map();

  const out = new Map<string, OhlcvBar>();

  for (const line of lines.slice(1)) {
    const cols = line.split(",");
    const date = normalizeDate(cols[dateIdx] ?? "");
    const close = parseNumber(cols[closeIdx]);
    if (!date || close == null) continue;

    out.set(date, {
      open: parseNumber(cols[openIdx]) ?? close,
      high: parseNumber(cols[highIdx]) ?? close,
      low: parseNumber(cols[lowIdx]) ?? close,
      close,
      volume: parseNumber(cols[volumeIdx]) ?? 0,
    });
  }

  return out;
}

/** Parse combined `data/market/prices.csv` aligned file. */
export function parseCombinedPricesCsv(raw: string): MarketDataRow[] {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map(normalizeHeader);
  const dateIdx = header.indexOf("date");
  if (dateIdx < 0) return [];

  const rows: MarketDataRow[] = [];

  for (const line of lines.slice(1)) {
    const cols = line.split(",");
    const date = normalizeDate(cols[dateIdx] ?? "");
    if (!date) continue;

    const prices = {} as Record<Ticker, number>;
    const ohlcv = {} as Record<Ticker, OhlcvBar>;
    let valid = true;

    for (const ticker of RL_TICKERS) {
      const key = TICKER_KEYS[ticker];
      const closeIdx = header.indexOf(`${key}_close`);
      if (closeIdx < 0) {
        valid = false;
        break;
      }
      const close = parseNumber(cols[closeIdx]);
      if (close == null) {
        valid = false;
        break;
      }
      prices[ticker] = close;
      ohlcv[ticker] = {
        open: parseNumber(cols[header.indexOf(`${key}_open`)]) ?? close,
        high: parseNumber(cols[header.indexOf(`${key}_high`)]) ?? close,
        low: parseNumber(cols[header.indexOf(`${key}_low`)]) ?? close,
        close,
        volume: parseNumber(cols[header.indexOf(`${key}_volume`)]) ?? 0,
      };
    }

    if (valid) rows.push({ date, prices, ohlcv });
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export function loadMarketDataFromDisk(): MarketDataPayload {
  if (!marketPricesFileExists()) {
    return {
      source: "Stooq historical CSV",
      tickers: [...RL_TICKERS],
      rows: [],
    };
  }

  const raw = readFileSync(PRICES_CSV_PATH, "utf-8");
  return {
    source: "Stooq historical CSV",
    tickers: [...RL_TICKERS],
    rows: parseCombinedPricesCsv(raw),
  };
}

/** Wide sp500.csv (close-only) → rows for Stooq replay (synthetic OHLCV). */
export function sp500PricesToMarketRows(
  prices: PriceHistoryPoint[],
): MarketDataRow[] {
  return prices.map((row) => {
    const pricesMap = {
      AAPL: row.AAPL,
      MSFT: row.MSFT,
      GOOGL: row.GOOGL,
      AMZN: row.AMZN,
      NVDA: row.NVDA,
    };
    const ohlcv = {} as Record<Ticker, OhlcvBar>;
    for (const ticker of RL_TICKERS) {
      const close = pricesMap[ticker];
      ohlcv[ticker] = {
        open: close,
        high: close,
        low: close,
        close,
        volume: 0,
      };
    }
    return { date: row.Date, prices: pricesMap, ohlcv };
  });
}

/**
 * Local `data/market/prices.csv` when present; otherwise sp500.csv from GitHub
 * (`MARKET_DATA_SP500_CSV_URL` / deep-rl-trading-agent data_fallback).
 */
export async function loadMarketData(): Promise<MarketDataPayload> {
  const disk = loadMarketDataFromDisk();
  if (disk.rows.length > 0) return disk;

  try {
    const prices = await fetchRemoteSp500Prices();
    const rows = sp500PricesToMarketRows(prices);
    return {
      source: "GitHub sp500.csv (data_fallback)",
      tickers: [...RL_TICKERS],
      rows,
    };
  } catch (error) {
    console.warn("[market-data] Remote sp500.csv unavailable:", error);
    return {
      source: "Stooq historical CSV",
      tickers: [...RL_TICKERS],
      rows: [],
    };
  }
}

export async function hasMarketData(): Promise<boolean> {
  const payload = await loadMarketData();
  return payload.rows.length > 0;
}

export function marketRowsToPriceHistory(rows: MarketDataRow[]): PriceHistoryPoint[] {
  return rows.map((row) => ({
    Date: row.date,
    AAPL: row.prices.AAPL,
    MSFT: row.prices.MSFT,
    GOOGL: row.prices.GOOGL,
    AMZN: row.prices.AMZN,
    NVDA: row.prices.NVDA,
  }));
}
