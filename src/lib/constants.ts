import type { GuardrailConfig } from "@/types/rl-trading";

export const RL_TICKERS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"] as const;

export const INITIAL_BALANCE = 100_000;
export const TRANSACTION_COST = 0.001;
export const OBSERVATION_LENGTH = 11;

/**
 * PPO inference runs inside this Next.js app (see `src/lib/ppo/policy.ts`).
 * There is no upstream model server — these are display labels only.
 */
export const INFERENCE_ENDPOINT = "/api/predict";
export const INFERENCE_RUNTIME_LABEL = "in-process · no upstream API";

export const DEFAULT_GUARDRAILS: GuardrailConfig = {
  maxSingleAssetAllocation: 0.35,
  maxRebalanceSize: 0.15,
  cashReservePct: 0.05,
  concentrationLimit: 0.4,
};

export const POLICY_MODEL_INFO = {
  algorithm: "PPO",
  checkpoint: "ppo_policy_100k",
  /** Weights exported from ONNX, replayed by a TypeScript MLP — see src/lib/ppo. */
  runtime: "TypeScript MLP (ONNX export)",
  universe: "AAPL, MSFT, GOOGL, AMZN, NVDA",
  observationDim: 11,
  actionDim: 5,
  hiddenLayers: "64 × 64 (tanh)",
} as const;
