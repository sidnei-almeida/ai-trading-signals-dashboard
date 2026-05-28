import { DEFAULT_API_URL, RL_TICKERS } from "@/lib/constants";
import { fetchFinsightDashboard } from "@/lib/finsight-dashboard-adapter";
import { getFinsightHealth } from "@/lib/finsight-api";
import { buildDemoPrediction } from "@/lib/demo-fallback";
import type { HealthResponse, PredictionResponse } from "@/types/rl-trading";

export async function getHealth(baseUrl?: string): Promise<HealthResponse> {
  const health = await getFinsightHealth(baseUrl);
  const ok = health.status === "healthy" || health.status === "ok";
  return {
    status: health.status,
    message: health.database
      ? `FinSight API · database ${health.database}`
      : "FinSight API",
    model_loaded: ok,
  };
}

export async function getDashboardData(baseUrl?: string) {
  const { data } = await fetchFinsightDashboard(baseUrl);
  return data;
}

async function fetchPpoPredict(
  observation: number[],
  baseUrl: string,
): Promise<PredictionResponse | null> {
  const url = `${baseUrl.replace(/\/$/, "")}/predict`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ observation }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as PredictionResponse;
  if (!Array.isArray(json.allocations) || json.allocations.length !== RL_TICKERS.length) {
    return null;
  }
  return {
    raw_action: json.raw_action ?? json.allocations.map((w) => Math.log(Math.max(w, 1e-8))),
    allocations: json.allocations,
  };
}

export async function predictAllocation(
  observation: number[],
  baseUrl?: string,
): Promise<PredictionResponse> {
  const apiBase = baseUrl ?? DEFAULT_API_URL;

  try {
    const ppo = await fetchPpoPredict(observation, apiBase);
    if (ppo) return ppo;
  } catch {
    // fall through to FinSight-derived weights
  }

  const { data } = await fetchFinsightDashboard(apiBase);
  const allocations = RL_TICKERS.map((t) => data.current_allocation[t] ?? 0);
  const raw_action = allocations.map((w) => Math.log(Math.max(w, 1e-8)));
  return { raw_action, allocations };
}

export { buildDemoPrediction };
