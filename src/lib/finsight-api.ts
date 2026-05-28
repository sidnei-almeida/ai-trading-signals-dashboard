import {
  FINSIGHT_API_BASE_URL,
  FINSIGHT_ENDPOINTS,
} from "@/lib/api-config";

export class FinsightApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "FinsightApiError";
  }
}

function resolveBaseUrl(override?: string): string {
  return (override ?? FINSIGHT_API_BASE_URL).replace(/\/$/, "");
}

async function fetchJson<T>(
  path: string,
  init?: RequestInit,
  baseUrl?: string,
): Promise<T> {
  const url = `${resolveBaseUrl(baseUrl)}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: string | { message?: string } };
      if (typeof body.detail === "string") detail = body.detail;
      else if (body.detail && typeof body.detail === "object" && body.detail.message) {
        detail = body.detail.message;
      }
    } catch {
      /* ignore */
    }
    throw new FinsightApiError(detail, response.status);
  }

  return response.json() as Promise<T>;
}

export interface FinsightHealthResponse {
  status: string;
  database?: string;
  timestamp?: string;
}

export interface FinsightAgentStatus {
  agent_status: string;
  exchange_connected?: boolean;
  balance: number | null;
  daily_pnl: number | null;
  open_positions?: number;
  last_update?: string;
}

export interface FinsightEquityPoint {
  recorded_at: string;
  equity: number;
  cash_balance: number;
}

export interface FinsightGuardrails {
  daily_stop_loss: number;
  max_leverage: number;
  allowed_symbols: string[];
  max_position_size: number;
  test_mode?: boolean;
}

export interface FinsightStrategy {
  mode: string;
  risk_per_trade?: number;
  take_profit_pct?: number | null;
  stop_loss_pct?: number | null;
}

export interface FinsightExchangeStatus {
  connected: boolean;
  exchange?: string;
  testnet?: boolean;
  test_mode?: boolean;
}

export function getFinsightHealth(baseUrl?: string) {
  return fetchJson<FinsightHealthResponse>(
    FINSIGHT_ENDPOINTS.health,
    undefined,
    baseUrl,
  );
}

export function getAgentStatus(baseUrl?: string) {
  return fetchJson<FinsightAgentStatus>(
    FINSIGHT_ENDPOINTS.agentStatus,
    undefined,
    baseUrl,
  );
}

export function getPortfolioHistory(days = 365, baseUrl?: string) {
  return fetchJson<FinsightEquityPoint[]>(
    `${FINSIGHT_ENDPOINTS.portfolioHistory}?days=${days}`,
    undefined,
    baseUrl,
  );
}

export function getGuardrails(baseUrl?: string) {
  return fetchJson<FinsightGuardrails>(
    FINSIGHT_ENDPOINTS.guardrails,
    undefined,
    baseUrl,
  );
}

export function getStrategy(baseUrl?: string) {
  return fetchJson<FinsightStrategy>(
    FINSIGHT_ENDPOINTS.strategy,
    undefined,
    baseUrl,
  );
}

export function getExchangeStatus(baseUrl?: string) {
  return fetchJson<FinsightExchangeStatus>(
    FINSIGHT_ENDPOINTS.exchangeStatus,
    undefined,
    baseUrl,
  );
}

export function controlAgent(
  action: "start" | "stop" | "emergency_stop",
  closeAllPositions = false,
  baseUrl?: string,
) {
  return fetchJson(
    FINSIGHT_ENDPOINTS.agentControl,
    {
      method: "POST",
      body: JSON.stringify({ action, close_all_positions: closeAllPositions }),
    },
    baseUrl,
  );
}
