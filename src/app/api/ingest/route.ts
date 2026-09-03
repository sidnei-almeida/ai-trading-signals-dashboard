import { NextResponse } from "next/server";

import { hasDatabase } from "@/lib/db/client";
import { ingestLatestBars } from "@/lib/db/ingest";
import { StooqIngestError } from "@/lib/market-ingest";

/**
 * Refresh `market_bars` from Stooq.
 *
 * Intended to be driven by the Vercel cron entry in vercel.json, but safe to
 * call by hand. `?force=1` re-downloads even when the stored bars are current;
 * without it a run inside `maxAgeDays` is a no-op that never touches Stooq.
 *
 * When `INGEST_SECRET` is set, the request must carry it as a bearer token.
 * Vercel cron sends `Authorization: Bearer $CRON_SECRET`, so setting both to
 * the same value protects the endpoint without extra wiring.
 */
async function handle(request: Request) {
  const secret = process.env.INGEST_SECRET ?? process.env.CRON_SECRET;
  if (secret) {
    const provided = request.headers.get("authorization");
    if (provided !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "NEON_POSTGRES is not configured; nothing to ingest into." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const maxAgeDays = Number(url.searchParams.get("maxAgeDays") ?? "1");

  try {
    const summary = await ingestLatestBars({
      force,
      maxAgeDays: Number.isFinite(maxAgeDays) ? maxAgeDays : 1,
    });
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stooq ingest failed.";
    console.error("[ingest]", message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: error instanceof StooqIngestError ? 502 : 500 },
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
