import { NextResponse } from "next/server";

import { loadMarketData } from "@/lib/market-csv";
import { MARKET_DATA_MISSING_MESSAGE } from "@/lib/stooq-dashboard";

export async function GET() {
  const payload = await loadMarketData();
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
