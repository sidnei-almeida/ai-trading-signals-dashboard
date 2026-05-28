import type { GuardrailConfig } from "@/types/rl-trading";

export const RL_TICKERS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"] as const;

export const INITIAL_BALANCE = 100_000;
export const TRANSACTION_COST = 0.001;
export const OBSERVATION_LENGTH = 11;

/** Remote FinSight API (old-quant-core) — not localhost. */
export const DEFAULT_API_URL =
  process.env.NEXT_PUBLIC_RL_TRADING_API_URL ??
  process.env.NEXT_PUBLIC_FINSIGHT_API_URL ??
  "https://groq-finance-inference.onrender.com";

export const DEFAULT_GUARDRAILS: GuardrailConfig = {
  maxSingleAssetAllocation: 0.35,
  maxRebalanceSize: 0.15,
  cashReservePct: 0.05,
  concentrationLimit: 0.4,
};

export const POLICY_MODEL_INFO = {
  algorithm: "PPO",
  runtime: "ONNX Runtime (CPU)",
  universe: "AAPL, MSFT, GOOGL, AMZN, NVDA",
  observationDim: 11,
  actionDim: 5,
} as const;
