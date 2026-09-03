/**
 * Server-side model service. Everything here runs in the Next.js process —
 * the deep-rl-trading-agent FastAPI deployment it replaces is gone.
 */

import { RL_TICKERS } from "@/lib/constants";
import { hasDatabase } from "@/lib/db/client";
import { getMarketBarsSummary } from "@/lib/db/market-repo";
import { PPO_MODEL_INFO, runPolicy } from "@/lib/ppo/policy";
import type { DatabaseHealth, HealthResponse } from "@/types/rl-trading";

/** Neutral observation used to smoke-test the policy on health checks. */
const PROBE_OBSERVATION = [100_000, 0, 0, 0, 0, 0, 100, 100, 100, 100, 100];

async function getDatabaseHealth(): Promise<DatabaseHealth> {
  if (!hasDatabase()) {
    return { configured: false, connected: false, barCount: 0, lastDate: null };
  }
  try {
    const summary = await getMarketBarsSummary();
    return {
      configured: true,
      connected: true,
      barCount: summary.barCount,
      lastDate: summary.lastDate,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      barCount: 0,
      lastDate: null,
      error: error instanceof Error ? error.message : "Postgres unreachable.",
    };
  }
}

export async function getHealth(): Promise<HealthResponse> {
  const database = await getDatabaseHealth();

  try {
    const probe = runPolicy(PROBE_OBSERVATION);
    const ok =
      probe.allocations.length === RL_TICKERS.length &&
      probe.allocations.every((w) => Number.isFinite(w));

    const storage = database.configured
      ? database.connected
        ? ` · Postgres ${database.barCount} bars`
        : " · Postgres unreachable"
      : " · CSV storage";

    return {
      status: ok ? "ok" : "degraded",
      message: ok
        ? `PPO policy loaded in-process · ${PPO_MODEL_INFO.checkpoint}${storage}`
        : "PPO policy produced invalid output.",
      model_loaded: ok,
      database,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to load PPO weights.",
      model_loaded: false,
      database,
    };
  }
}
