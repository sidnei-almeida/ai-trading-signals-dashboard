import { NextResponse } from "next/server";

import { getDashboardData } from "@/lib/api-server";
import { buildDemoDashboardData } from "@/lib/demo-fallback";
import { buildStooqDashboardData } from "@/lib/stooq-dashboard";
import type { DashboardDataEnvelope } from "@/types/rl-trading";

export async function GET() {
  const fetchedAt = new Date().toISOString();

  const stooq = await buildStooqDashboardData();
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
    const data = await Promise.race([
      getDashboardData(),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("FinSight API timeout (cold start?)")),
          12_000,
        );
      }),
    ]);
    const envelope: DashboardDataEnvelope = {
      data,
      isLive: true,
      source: "api",
      fetchedAt,
    };
    return NextResponse.json(envelope);
  } catch (error) {
    console.warn("[dashboard-data] FinSight unavailable, using bundled demo:", error);
    const envelope: DashboardDataEnvelope = {
      data: await buildDemoDashboardData(),
      isLive: false,
      source: "demo_fallback",
      fetchedAt,
      error:
        "Live market API unavailable. Showing bundled S&P 500 demo curves (not live PPO).",
    };
    return NextResponse.json(envelope);
  }
}

export const dynamic = "force-dynamic";
