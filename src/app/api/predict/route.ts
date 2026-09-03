import { NextResponse } from "next/server";

import { OBSERVATION_LENGTH } from "@/lib/constants";
import { runPolicy } from "@/lib/ppo/policy";
import type { PredictionEnvelope } from "@/types/rl-trading";

/** PPO inference runs in this process — no external model server. */
export async function POST(request: Request) {
  const fetchedAt = new Date().toISOString();

  let body: { observation?: number[] };
  try {
    body = (await request.json()) as { observation?: number[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const observation = body.observation ?? [];

  if (observation.length !== OBSERVATION_LENGTH) {
    return NextResponse.json(
      {
        error: `Observation must have length ${OBSERVATION_LENGTH}, received ${observation.length}.`,
      },
      { status: 400 },
    );
  }

  if (!observation.every((v) => typeof v === "number" && Number.isFinite(v))) {
    return NextResponse.json(
      { error: "Observation must contain only finite numbers." },
      { status: 400 },
    );
  }

  const { raw_action, allocations, value } = runPolicy(observation);

  const envelope: PredictionEnvelope = {
    result: { raw_action, allocations },
    value,
    isLive: true,
    source: "local_ppo",
    fetchedAt,
  };
  return NextResponse.json(envelope);
}

export const dynamic = "force-dynamic";
