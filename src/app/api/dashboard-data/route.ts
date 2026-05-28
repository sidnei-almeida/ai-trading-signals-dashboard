import { NextResponse } from "next/server";

import { getDashboardData } from "@/lib/api-server";
import {
  buildStooqDashboardData,
  MARKET_DATA_MISSING_MESSAGE,
} from "@/lib/stooq-dashboard";
import type { DashboardDataEnvelope } from "@/types/rl-trading";

export async function GET() {
  const fetchedAt = new Date().toISOString();

  const stooq = buildStooqDashboardData();
  if (stooq) {
    const envelope: DashboardDataEnvelope = {
      data: stooq,
      isLive: true,
      source: "stooq_historical",
      fetchedAt,
    };
    return NextResponse.json(envelope);
  }

  try {
    const data = await getDashboardData();
    const envelope: DashboardDataEnvelope = {
      data,
      isLive: true,
      source: "api",
      fetchedAt,
    };
    return NextResponse.json(envelope);
  } catch (error) {
    console.warn("[dashboard-data] FinSight unavailable:", error);
    const envelope: DashboardDataEnvelope = {
      data: null,
      isLive: false,
      source: "demo_fallback",
      fetchedAt,
      error: MARKET_DATA_MISSING_MESSAGE,
    };
    return NextResponse.json(envelope, { status: 404 });
  }
}

export const dynamic = "force-dynamic";
