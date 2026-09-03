import { NextResponse } from "next/server";

import { syncDashboardData } from "@/lib/db/dashboard-sync";
import { MARKET_DATA_MISSING_MESSAGE } from "@/lib/stooq-dashboard";
import type { DashboardDataEnvelope } from "@/types/rl-trading";

/**
 * Refresh Postgres from the bundled price history, then serve the stored PPO
 * backtest. Both steps are conditional — see `syncDashboardData` — so opening
 * the dashboard costs one cheap freshness check once the data is in place.
 */
export async function GET() {
  const fetchedAt = new Date().toISOString();

  try {
    const result = await syncDashboardData();

    if (!result) {
      const envelope: DashboardDataEnvelope = {
        data: null,
        isLive: false,
        source: "demo_fallback",
        fetchedAt,
        error: MARKET_DATA_MISSING_MESSAGE,
      };
      return NextResponse.json(envelope, { status: 503 });
    }

    const envelope: DashboardDataEnvelope = {
      data: result.data,
      isLive: true,
      source: "stooq_historical",
      fetchedAt,
      storage: result.storage,
      barsWritten: result.barsWritten,
      backtestComputed: result.backtestComputed,
      computedAt: result.computedAt,
    };
    return NextResponse.json(envelope);
  } catch (error) {
    console.error("[dashboard-data] sync failed:", error);
    const envelope: DashboardDataEnvelope = {
      data: null,
      isLive: false,
      source: "demo_fallback",
      fetchedAt,
      error:
        error instanceof Error ? error.message : "Dashboard data sync failed.",
    };
    return NextResponse.json(envelope, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
