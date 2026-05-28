import { NextResponse } from "next/server";

import { OBSERVATION_LENGTH } from "@/lib/constants";
import { buildDemoPrediction } from "@/lib/demo-fallback";
import { predictAllocation } from "@/lib/api-server";
import type { PredictionEnvelope } from "@/types/rl-trading";

export async function POST(request: Request) {
  const fetchedAt = new Date().toISOString();
  const body = (await request.json()) as { observation?: number[] };
  const observation = body.observation ?? [];

  if (observation.length !== OBSERVATION_LENGTH) {
    return NextResponse.json(
      {
        error: `Observation must have length ${OBSERVATION_LENGTH}, received ${observation.length}.`,
      },
      { status: 400 },
    );
  }

  try {
    const result = await predictAllocation(observation);
    const envelope: PredictionEnvelope = {
      result,
      isLive: true,
      source: "api",
      fetchedAt,
    };
    return NextResponse.json(envelope);
  } catch (error) {
    console.warn("[predict] API fallback:", error);
    const demo = buildDemoPrediction(observation);
    const envelope: PredictionEnvelope = {
      result: {
        raw_action: demo.raw_action,
        allocations: demo.allocations,
      },
      isLive: false,
      source: "demo_fallback",
      fetchedAt,
    };
    return NextResponse.json(envelope);
  }
}

export const dynamic = "force-dynamic";
