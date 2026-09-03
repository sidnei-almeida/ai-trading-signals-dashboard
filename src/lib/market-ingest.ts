import { RL_TICKERS } from "@/lib/constants";
import { parseStooqTickerCsv, type MarketDataRow, type OhlcvBar } from "@/lib/market-csv";
import type { Ticker } from "@/types/rl-trading";

/** Stooq symbols for the PPO universe. */
const STOOQ_SYMBOLS: Record<Ticker, string> = {
  AAPL: "aapl.us",
  MSFT: "msft.us",
  GOOGL: "googl.us",
  AMZN: "amzn.us",
  NVDA: "nvda.us",
};

const FETCH_TIMEOUT_MS = 30_000;

export class StooqIngestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StooqIngestError";
  }
}

/** Whether an API key is configured, and its length — never the value itself. */
export function stooqKeyDiagnostics(apiKey?: string): {
  apiKeyPresent: boolean;
  apiKeyLength: number;
} {
  const key = apiKey ?? process.env.STOOQ_API_KEY?.trim();
  return { apiKeyPresent: Boolean(key), apiKeyLength: key?.length ?? 0 };
}

function toYmd(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");
}

function isoToYmd(iso: string): string {
  return iso.replaceAll("-", "");
}

function buildUrl(symbol: string, d1: string, d2: string, apiKey?: string): string {
  const params = new URLSearchParams({ s: symbol, d1, d2, i: "d" });
  if (apiKey) params.set("apikey", apiKey);
  return `https://stooq.com/q/d/l/?${params.toString()}`;
}

/**
 * Fetch one ticker's daily CSV.
 *
 * Without an API key Stooq answers with a JavaScript proof-of-work page rather
 * than an HTTP error, so the body has to be inspected: anything that is not a
 * `Date,...` header means the download was refused.
 */
async function fetchTickerCsv(
  symbol: string,
  d1: string,
  d2: string,
  apiKey?: string,
): Promise<string> {
  const response = await fetch(buildUrl(symbol, d1, d2, apiKey), {
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      // Stooq serves its bot challenge to requests that do not look like a
      // browser, so send a plain desktop UA alongside the key.
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      Accept: "text/csv,text/plain,*/*",
    },
  });

  if (!response.ok) {
    throw new StooqIngestError(`Stooq HTTP ${response.status} for ${symbol}.`);
  }

  const text = await response.text();

  if (!text.trim().toLowerCase().startsWith("date,")) {
    const { apiKeyPresent, apiKeyLength } = stooqKeyDiagnostics(apiKey);
    const keyState = apiKeyPresent
      ? `STOOQ_API_KEY present (${apiKeyLength} chars) but rejected`
      : "STOOQ_API_KEY not visible to this process";
    const reason = /captcha|apikey|verify your browser|requires JavaScript/i.test(text)
      ? `Stooq refused the download (bot challenge). ${keyState}.`
      : `Unexpected Stooq response: ${text.slice(0, 160)}`;
    throw new StooqIngestError(`${reason} [${symbol}]`);
  }

  return text;
}

export interface StooqFetchResult {
  rows: MarketDataRow[];
  /** Dates present for some tickers but not all — excluded from `rows`. */
  droppedDates: number;
}

/**
 * Download daily bars for the whole universe and align them onto the dates
 * where every ticker traded, which is what the backtest requires.
 */
export async function fetchStooqBars(options: {
  from: string;
  to?: string;
  apiKey?: string;
}): Promise<StooqFetchResult> {
  const apiKey = options.apiKey ?? process.env.STOOQ_API_KEY?.trim() ?? undefined;
  const d1 = isoToYmd(options.from);
  const d2 = options.to ? isoToYmd(options.to) : toYmd(new Date());

  const perTicker = new Map<Ticker, Map<string, OhlcvBar>>();

  for (const ticker of RL_TICKERS) {
    const raw = await fetchTickerCsv(STOOQ_SYMBOLS[ticker], d1, d2, apiKey);
    const parsed = parseStooqTickerCsv(raw);
    if (parsed.size === 0) {
      throw new StooqIngestError(`Stooq returned no rows for ${ticker}.`);
    }
    perTicker.set(ticker, parsed);
  }

  const first = perTicker.get(RL_TICKERS[0])!;
  const allDates = [...first.keys()].sort((a, b) => a.localeCompare(b));

  const rows: MarketDataRow[] = [];
  let droppedDates = 0;

  for (const date of allDates) {
    const ohlcv = {} as Record<Ticker, OhlcvBar>;
    const prices = {} as Record<Ticker, number>;
    let complete = true;

    for (const ticker of RL_TICKERS) {
      const bar = perTicker.get(ticker)?.get(date);
      if (!bar || !Number.isFinite(bar.close)) {
        complete = false;
        break;
      }
      ohlcv[ticker] = bar;
      prices[ticker] = bar.close;
    }

    if (complete) rows.push({ date, prices, ohlcv });
    else droppedDates += 1;
  }

  if (rows.length === 0) {
    throw new StooqIngestError(
      `Stooq returned no date where all ${RL_TICKERS.length} tickers traded.`,
    );
  }

  return { rows, droppedDates };
}
