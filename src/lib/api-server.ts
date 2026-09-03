/**
 * Server-side model service. Everything here runs in the Next.js process —
 * the deep-rl-trading-agent FastAPI deployment it replaces is gone.
 */

import { RL_TICKERS } from "@/lib/constants";
import { PPO_MODEL_INFO, runPolicy } from "@/lib/ppo/policy";
import type { HealthResponse } from "@/types/rl-trading";

/** Neutral observation used to smoke-test the policy on health checks. */
const PROBE_OBSERVATION = [100_000, 0, 0, 0, 0, 0, 100, 100, 100, 100, 100];

export async function getHealth(): Promise<HealthResponse> {
  try {
    const probe = runPolicy(PROBE_OBSERVATION);
    const ok =
      probe.allocations.length === RL_TICKERS.length &&
      probe.allocations.every((w) => Number.isFinite(w));

    return {
      status: ok ? "ok" : "degraded",
      message: ok
        ? `PPO policy loaded in-process · ${PPO_MODEL_INFO.checkpoint}`
        : "PPO policy produced invalid output.",
      model_loaded: ok,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to load PPO weights.",
      model_loaded: false,
    };
  }
}
