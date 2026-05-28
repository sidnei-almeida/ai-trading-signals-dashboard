import { NextResponse } from "next/server";

import { loadMarketDataFromDisk, marketPricesFileExists } from "@/lib/market-csv";
import { MARKET_DATA_MISSING_MESSAGE } from "@/lib/stooq-dashboard";

export async function GET() {
  if (!marketPricesFileExists()) {
    return NextResponse.json(
      {
        error: MARKET_DATA_MISSING_MESSAGE,
        source: "Stooq historical CSV",
        tickers: [],
        rows: [],
      },
      { status: 404 },
    );
  }

  const payload = loadMarketDataFromDisk();
  if (payload.rows.length === 0) {
    return NextResponse.json(
      {
        error: "prices.csv is empty or invalid.",
        ...payload,
      },
      { status: 422 },
    );
  }

  return NextResponse.json(payload);
}

export const dynamic = "force-dynamic";
