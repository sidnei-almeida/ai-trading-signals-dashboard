import { RL_TICKERS } from "@/lib/constants";
import { getSql } from "@/lib/db/client";
import type { MarketDataRow, OhlcvBar } from "@/lib/market-csv";
import type { Ticker } from "@/types/rl-trading";

/** Bars per statement — keeps each HTTP request to Neon a sane size. */
const UPSERT_CHUNK = 5000;

export interface MarketBarsSummary {
  barCount: number;
  firstDate: string | null;
  lastDate: string | null;
  source: string | null;
}

function toIsoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/** Row counts and date range currently stored, used for freshness checks. */
export async function getMarketBarsSummary(): Promise<MarketBarsSummary> {
  const sql = getSql();
  const rows = (await sql`
    select
      count(*)::int                    as bar_count,
      min(bar_date)                    as first_date,
      max(bar_date)                    as last_date,
      (array_agg(source order by updated_at desc))[1] as source
    from market_bars
  `) as Array<{
    bar_count: number;
    first_date: unknown;
    last_date: unknown;
    source: string | null;
  }>;

  const row = rows[0];
  if (!row || row.bar_count === 0) {
    return { barCount: 0, firstDate: null, lastDate: null, source: null };
  }
  return {
    barCount: row.bar_count,
    firstDate: toIsoDate(row.first_date),
    lastDate: toIsoDate(row.last_date),
    source: row.source,
  };
}

/**
 * Replace the stored bars with `rows`.
 *
 * Written as a single `unnest` insert so a 12k-bar refresh is one round trip
 * rather than one statement per row.
 */
export async function upsertMarketBars(
  rows: MarketDataRow[],
  source: string,
): Promise<number> {
  if (rows.length === 0) return 0;
  const sql = getSql();

  const tickers: string[] = [];
  const dates: string[] = [];
  const open: number[] = [];
  const high: number[] = [];
  const low: number[] = [];
  const close: number[] = [];
  const volume: number[] = [];

  for (const row of rows) {
    for (const ticker of RL_TICKERS) {
      const bar = row.ohlcv[ticker];
      if (!bar || !Number.isFinite(bar.close)) continue;
      tickers.push(ticker);
      dates.push(row.date);
      open.push(bar.open);
      high.push(bar.high);
      low.push(bar.low);
      close.push(bar.close);
      volume.push(bar.volume);
    }
  }

  if (tickers.length === 0) return 0;

  const statement = `
    insert into market_bars
      (ticker, bar_date, open, high, low, close, volume, source)
    select t, d, o, h, l, c, v, $8::text
    from unnest(
      $1::text[], $2::date[], $3::float8[], $4::float8[],
      $5::float8[], $6::float8[], $7::float8[]
    ) as u(t, d, o, h, l, c, v)
    on conflict (ticker, bar_date) do update set
      open       = excluded.open,
      high       = excluded.high,
      low        = excluded.low,
      close      = excluded.close,
      volume     = excluded.volume,
      source     = excluded.source,
      updated_at = now()`;

  for (let start = 0; start < tickers.length; start += UPSERT_CHUNK) {
    const end = Math.min(start + UPSERT_CHUNK, tickers.length);
    await sql.query(statement, [
      tickers.slice(start, end),
      dates.slice(start, end),
      open.slice(start, end),
      high.slice(start, end),
      low.slice(start, end),
      close.slice(start, end),
      volume.slice(start, end),
      source,
    ]);
  }

  return tickers.length;
}

/** Every stored bar, pivoted back into the per-date shape the dashboard uses. */
export async function loadMarketBars(): Promise<MarketDataRow[]> {
  const sql = getSql();
  const rows = (await sql`
    select ticker, bar_date, open, high, low, close, volume
    from market_bars
    order by bar_date asc, ticker asc
  `) as Array<{
    ticker: string;
    bar_date: unknown;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;

  const byDate = new Map<string, Partial<Record<Ticker, OhlcvBar>>>();
  for (const row of rows) {
    if (!(RL_TICKERS as readonly string[]).includes(row.ticker)) continue;
    const date = toIsoDate(row.bar_date);
    let bars = byDate.get(date);
    if (!bars) {
      bars = {};
      byDate.set(date, bars);
    }
    bars[row.ticker as Ticker] = {
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume),
    };
  }

  const out: MarketDataRow[] = [];
  for (const [date, bars] of byDate) {
    // Drop partial days so the backtest never sees a missing price.
    if (!RL_TICKERS.every((t) => bars[t] != null)) continue;
    const ohlcv = {} as Record<Ticker, OhlcvBar>;
    const prices = {} as Record<Ticker, number>;
    for (const ticker of RL_TICKERS) {
      const bar = bars[ticker]!;
      ohlcv[ticker] = bar;
      prices[ticker] = bar.close;
    }
    out.push({ date, prices, ohlcv });
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Close prices pivoted to one row per date.
 *
 * The backtest and every equity chart only need closes, so this avoids pulling
 * five OHLCV rows per trading day across the wire.
 */
export async function loadMarketCloses(): Promise<
  Array<{ date: string; prices: Record<Ticker, number> }>
> {
  const sql = getSql();
  const rows = (await sql`
    select
      bar_date,
      max(close) filter (where ticker = 'AAPL')  as aapl,
      max(close) filter (where ticker = 'MSFT')  as msft,
      max(close) filter (where ticker = 'GOOGL') as googl,
      max(close) filter (where ticker = 'AMZN')  as amzn,
      max(close) filter (where ticker = 'NVDA')  as nvda
    from market_bars
    group by bar_date
    having count(*) filter (
      where ticker in ('AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA')
    ) = 5
    order by bar_date asc
  `) as Array<{
    bar_date: unknown;
    aapl: number;
    msft: number;
    googl: number;
    amzn: number;
    nvda: number;
  }>;

  return rows.map((row) => ({
    date: toIsoDate(row.bar_date),
    prices: {
      AAPL: Number(row.aapl),
      MSFT: Number(row.msft),
      GOOGL: Number(row.googl),
      AMZN: Number(row.amzn),
      NVDA: Number(row.nvda),
    },
  }));
}
