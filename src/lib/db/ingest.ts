import { getMarketBarsSummary, upsertMarketBars } from "@/lib/db/market-repo";
import { fetchStooqBars } from "@/lib/market-ingest";

/** How far back to re-fetch on an incremental run, so late revisions land. */
const OVERLAP_DAYS = 7;

/** First date to request when the table is empty. */
const BACKFILL_START = "2015-01-01";

export interface IngestSummary {
  skipped: boolean;
  reason?: string;
  /** Trading days returned by Stooq with a price for every ticker. */
  tradingDaysFetched: number;
  /** Bar rows written (5 per complete trading day). */
  barsWritten: number;
  previousLastDate: string | null;
  lastDate: string | null;
  requestedFrom: string;
}

function shiftDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Pull fresh daily bars from Stooq into `market_bars`.
 *
 * Incremental by default: it re-requests the last week so corrected bars are
 * picked up, and backfills from 2015 when the table is empty. The upsert is
 * keyed on (ticker, date), so overlapping days are corrections rather than
 * duplicates.
 *
 * Once newer bars land, the next dashboard request sees a different bar range,
 * which changes the backtest fingerprint and causes the curve to be recomputed
 * and stored — no separate cache invalidation is needed.
 */
export async function ingestLatestBars(options?: {
  /** Skip the download when stored data is younger than this. */
  maxAgeDays?: number;
  /** Fetch regardless of how fresh the stored data is. */
  force?: boolean;
}): Promise<IngestSummary> {
  const summary = await getMarketBarsSummary();
  const previousLastDate = summary.lastDate;
  const maxAgeDays = options?.maxAgeDays ?? 0;

  if (!options?.force && previousLastDate && maxAgeDays > 0) {
    const cutoff = shiftDays(todayIso(), -maxAgeDays);
    if (previousLastDate >= cutoff) {
      return {
        skipped: true,
        reason: `Stored bars reach ${previousLastDate}, within ${maxAgeDays} day(s) of today.`,
        tradingDaysFetched: 0,
        barsWritten: 0,
        previousLastDate,
        lastDate: previousLastDate,
        requestedFrom: cutoff,
      };
    }
  }

  const requestedFrom = previousLastDate
    ? shiftDays(previousLastDate, -OVERLAP_DAYS)
    : BACKFILL_START;

  const { rows } = await fetchStooqBars({ from: requestedFrom });
  const barsWritten = await upsertMarketBars(rows, "Stooq daily API");

  return {
    skipped: false,
    tradingDaysFetched: rows.length,
    barsWritten,
    previousLastDate,
    lastDate: rows[rows.length - 1]?.date ?? previousLastDate,
    requestedFrom,
  };
}
