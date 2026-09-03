import { NextResponse } from "next/server";

import { getHealth } from "@/lib/api-server";

export async function GET() {
  const health = await getHealth();
  return NextResponse.json({
    ...health,
    isLive: health.model_loaded,
    source: "local_ppo" as const,
  });
}

export const dynamic = "force-dynamic";
