import { NextResponse } from "next/server";

import { getHealth } from "@/lib/api-server";

export async function GET() {
  try {
    const health = await getHealth();
    return NextResponse.json({
      ...health,
      isLive: health.model_loaded === true,
      source: "api" as const,
    });
  } catch {
    return NextResponse.json({
      status: "unavailable",
      message:
        "FinSight API unreachable (groq-finance-inference). Using labeled demo fallback.",
      model_loaded: false,
      isLive: false,
      source: "demo_fallback" as const,
    });
  }
}

export const dynamic = "force-dynamic";
