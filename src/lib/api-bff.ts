import type {
  DashboardDataEnvelope,
  HealthResponse,
  PredictionEnvelope,
  PredictionRequest,
} from "@/types/rl-trading";
import type { MarketDataPayload } from "@/lib/market-csv";

export class ApiBffError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiBffError";
  }
}

export async function fetchHealthBff(): Promise<
  HealthResponse & { isLive: boolean; source: "local_ppo" | "demo_fallback" }
> {
  const response = await fetch("/api/health", { cache: "no-store" });
  if (!response.ok) throw new ApiBffError(response.statusText, response.status);
  return response.json();
}

export async function fetchDashboardDataBff(): Promise<DashboardDataEnvelope> {
  const response = await fetch("/api/dashboard-data", { cache: "no-store" });
  const json = (await response.json()) as DashboardDataEnvelope;
  if (!response.ok) {
    throw new ApiBffError(json.error ?? response.statusText, response.status);
  }
  if (!json.data) {
    throw new ApiBffError(json.error ?? "Dashboard data unavailable", response.status);
  }
  return json;
}

export async function fetchMarketDataBff(): Promise<MarketDataPayload> {
  const response = await fetch("/api/market-data", { cache: "no-store" });
  const json = (await response.json()) as MarketDataPayload & { error?: string };
  if (!response.ok) {
    throw new ApiBffError(json.error ?? response.statusText, response.status);
  }
  return json;
}

export async function fetchPredictBff(
  observation: number[],
): Promise<PredictionEnvelope> {
  const body: PredictionRequest = { observation };
  const response = await fetch("/api/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new ApiBffError(response.statusText, response.status);
  return response.json();
}
