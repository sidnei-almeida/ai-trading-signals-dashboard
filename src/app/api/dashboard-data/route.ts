import { NextResponse } from "next/server";

import { MARKET_DATA_MISSING_MESSAGE, buildStooqDashboardData } from "@/lib/stooq-dashboard";
import type { DashboardDataEnvelope } from "@/types/rl-trading";

/**
 * Full PPO backtest over the bundled price history, computed in this process.
 * Replaces the retired `/api/v1/dashboard-data` endpoint of the FastAPI service.
 */
export async function GET() {
  const fetchedAt = new Date().toISOString();

  try {
    const data = await buildStooqDashboardData();

    if (!data) {
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
      data,
      isLive: true,
      source: "stooq_historical",
      fetchedAt,
    };
    return NextResponse.json(envelope);
  } catch (error) {
    console.error("[dashboard-data] PPO backtest failed:", error);
    const envelope: DashboardDataEnvelope = {
      data: null,
      isLive: false,
      source: "demo_fallback",
      fetchedAt,
      error: error instanceof Error ? error.message : "PPO backtest failed.",
    };
    return NextResponse.json(envelope, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
