import { NextResponse } from "next/server";

import { hasDatabase } from "@/lib/db/client";
import { loadMarketBars } from "@/lib/db/market-repo";
import { RL_TICKERS } from "@/lib/constants";
import { loadMarketData, type MarketDataPayload } from "@/lib/market-csv";
import { MARKET_DATA_MISSING_MESSAGE } from "@/lib/stooq-dashboard";

/**
 * Bars for Market Watch. Served from Postgres once the dashboard boot has
 * synced it; falls back to the CSV path when no database is configured or the
 * table is still empty.
 */
async function loadPayload(): Promise<MarketDataPayload> {
  if (hasDatabase()) {
    try {
      const rows = await loadMarketBars();
      if (rows.length > 0) {
        return {
          source: "Neon Postgres (market_bars)",
          dataSource: "stooq_historical",
          tickers: [...RL_TICKERS],
          rows,
        };
      }
    } catch (error) {
      console.warn("[market-data] Postgres unavailable, falling back to CSV:", error);
    }
  }
  return loadMarketData();
}

export async function GET() {
  const payload = await loadPayload();

  if (payload.rows.length === 0) {
    return NextResponse.json(
      {
        error: MARKET_DATA_MISSING_MESSAGE,
        source: payload.source,
        tickers: [],
        rows: [],
      },
      { status: 404 },
    );
  }

  return NextResponse.json(payload);
}

export const dynamic = "force-dynamic";
