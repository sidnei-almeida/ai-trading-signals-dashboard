export const TICKERS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"] as const;

export type Ticker = (typeof TICKERS)[number];

/** Portfolio risk profile (legacy UI: Conservative / Moderate→Balanced / Aggressive). */
export type StrategyMode = "conservative" | "balanced" | "aggressive";

export type DataSource =
  | "yfinance"
  | "csv_fallback"
  | "synthetic"
  | "demo_local"
  | "stooq_historical";

export interface HealthResponse {
  status: string;
  message?: string;
  model_loaded: boolean;
}

export interface PriceHistoryPoint {
  Date: string;
  AAPL: number;
  MSFT: number;
  GOOGL: number;
  AMZN: number;
  NVDA: number;
}

export interface AgentHistoryPoint {
  index: number;
  value: number;
}

export interface BenchmarkHistoryPoint {
  index: number;
  value: number;
}

export interface AllocationWeights {
  AAPL: number;
  MSFT: number;
  GOOGL: number;
  AMZN: number;
  NVDA: number;
}

export interface DashboardData {
  tickers: Ticker[];
  data_source: DataSource;
  initial_balance: number;
  transaction_cost: number;
  current_allocation: AllocationWeights;
  agent_history: number[];
  benchmark_history: number[];
  price_history: PriceHistoryPoint[];
}

export interface DashboardDataEnvelope {
  data: DashboardData | null;
  isLive: boolean;
  source: "api" | "demo_fallback" | "stooq_historical";
  fetchedAt: string;
  error?: string;
}

/** Full backtest curve — preserved when live replay starts. */
export interface HistoricalChartSnapshot {
  agent_history: number[];
  benchmark_history: number[];
  dates: string[];
}

/** One live replay session point mapped to a historical index. */
export interface LiveReplayPoint {
  index: number;
  date: string;
  agent: number;
  benchmark: number;
}

export type ObservationVector = [
  number, // cash
  number, // AAPL shares
  number, // MSFT shares
  number, // GOOGL shares
  number, // AMZN shares
  number, // NVDA shares
  number, // AAPL price
  number, // MSFT price
  number, // GOOGL price
  number, // AMZN price
  number, // NVDA price
];

export interface PredictionRequest {
  observation: number[];
}

export interface PredictionResponse {
  raw_action: number[];
  allocations: number[];
}

export interface PredictionEnvelope {
  result: PredictionResponse;
  /** Critic value estimate for the observation, when the source provides one. */
  value?: number;
  isLive: boolean;
  source: "local_ppo" | "demo_fallback";
  fetchedAt: string;
}

export type ActivityEventStatus =
  | "pending"
  | "approved"
  | "blocked"
  | "simulated";

export interface ActivityEvent {
  id: string;
  time: string;
  source: string;
  event: string;
  /** Display symbol for feed */
  symbol: string;
  signal?: string;
  confidence?: number | null;
  riskCheck?: string;
  action: string;
  status: ActivityEventStatus;
  /** @deprecated use symbol */
  ticker?: Ticker | "PORTFOLIO";
  allocation?: number | null;
  /** @deprecated use riskCheck */
  guardrail?: string;
}

export interface RebalanceOrder {
  id: string;
  ticker: Ticker;
  currentWeight: number;
  /** Mode-adjusted target used for simulated execution */
  targetWeight: number;
  /** Raw PPO /predict allocation */
  ppoTargetWeight: number;
  delta: number;
  status: ActivityEventStatus;
  reason?: string;
}

export interface GuardrailConfig {
  maxSingleAssetAllocation: number;
  maxRebalanceSize: number;
  cashReservePct: number;
  concentrationLimit: number;
}

export interface SessionSettings {
  operatingMode: "paper" | "demo";
  rebalanceIntervalMinutes: number;
  startingCash: number;
  dataSourcePreference: "api" | "auto";
  /** Ms between historical replay ticks when agent is running */
  replayTickMs: number;
}
