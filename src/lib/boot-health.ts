import { fetchHealthBff } from "@/lib/api-bff";
import type { HealthResponse } from "@/types/rl-trading";

const POLICY_RETRY_MAX = 5;
const POLICY_RETRY_DELAY_MS = 2500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type PolicyHealthResult = HealthResponse & {
  isLive: boolean;
  source: "api" | "demo_fallback";
};

export async function fetchPolicyHealthWithRetry(options: {
  onAttempt?: (attempt: number, max: number) => void;
  onRetryWait?: () => void;
}): Promise<PolicyHealthResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= POLICY_RETRY_MAX; attempt++) {
    options.onAttempt?.(attempt, POLICY_RETRY_MAX);

    try {
      const health = await fetchHealthBff();
      if (health.isLive && health.model_loaded) {
        return health;
      }
      lastError = new Error(
        health.message ??
          "PPO policy API responded but model is not loaded (offline or cold).",
      );
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("PPO policy API unreachable.");
    }

    if (attempt < POLICY_RETRY_MAX) {
      options.onRetryWait?.();
      await sleep(POLICY_RETRY_DELAY_MS);
    }
  }

  throw (
    lastError ??
    new Error("PPO policy API unavailable after multiple attempts.")
  );
}

export { POLICY_RETRY_MAX };
