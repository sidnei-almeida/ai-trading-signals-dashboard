/**
 * Pull fresh Stooq bars into Neon Postgres.
 *
 *   npm run data:sync           # incremental — re-fetches the last week
 *   npm run data:sync -- --force
 *
 * Requires STOOQ_API_KEY (Stooq serves a bot challenge without one) and
 * NEON_POSTGRES. The deployed app does the same thing on a cron; this is the
 * manual path for local runs and backfills.
 */

import path from "path";

import { ingestLatestBars } from "../src/lib/db/ingest";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(path.join(process.cwd(), file));
    } catch {
      /* file absent — fall through to the ambient environment */
    }
  }
}

async function main() {
  loadEnv();

  if (!process.env.NEON_POSTGRES && !process.env.DATABASE_URL) {
    console.error("NEON_POSTGRES is not set (checked .env.local, .env, environment).");
    process.exit(1);
  }
  if (!process.env.STOOQ_API_KEY) {
    console.warn("STOOQ_API_KEY is not set — Stooq will likely answer with a bot challenge.");
  }

  const force = process.argv.includes("--force");
  const summary = await ingestLatestBars({ force, maxAgeDays: force ? 0 : 1 });

  if (summary.skipped) {
    console.log(`Skipped: ${summary.reason}`);
    return;
  }

  console.log(`Requested from   ${summary.requestedFrom}`);
  console.log(`Trading days     ${summary.tradingDaysFetched}`);
  console.log(`Bars written     ${summary.barsWritten}`);
  console.log(`Last date        ${summary.previousLastDate ?? "(empty)"} -> ${summary.lastDate}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
