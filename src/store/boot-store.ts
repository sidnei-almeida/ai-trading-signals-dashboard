"use client";

import { create } from "zustand";

export type BootPhase =
  | "idle"
  | "loading_market_data"
  | "validating_market_data"
  | "checking_policy_api"
  | "initializing_portfolio"
  | "preparing_session"
  | "ready"
  | "error";

export type BootStepStatus = "pending" | "loading" | "ready" | "warning" | "failed";

export type BootSubsystemStatus = "pending" | "loading" | "ready" | "failed";

export interface BootStep {
  id: string;
  label: string;
  status: BootStepStatus;
}

export interface BootLogEntry {
  id: string;
  time: string;
  message: string;
  level: "info" | "warn" | "error" | "success";
}

interface BootState {
  phase: BootPhase;
  steps: BootStep[];
  bootLogs: BootLogEntry[];
  bootError: string | null;
  marketDataStatus: BootSubsystemStatus;
  policyApiStatus: BootSubsystemStatus;
  portfolioInitStatus: BootSubsystemStatus;
  policyRetryAttempt: number;
  policyRetryMax: number;
  warmingMessage: string | null;
  bootRunId: number;

  setPhase: (phase: BootPhase) => void;
  setStepStatus: (id: string, status: BootStepStatus) => void;
  setMarketDataStatus: (status: BootSubsystemStatus) => void;
  setPolicyApiStatus: (status: BootSubsystemStatus) => void;
  setPortfolioInitStatus: (status: BootSubsystemStatus) => void;
  setBootError: (error: string | null) => void;
  setPolicyRetry: (attempt: number, max: number) => void;
  setWarmingMessage: (message: string | null) => void;
  appendLog: (message: string, level?: BootLogEntry["level"]) => void;
  resetBoot: () => void;
  bumpBootRun: () => number;
}

export const BOOT_STEPS: BootStep[] = [
  { id: "market_csv", label: "Loading market history", status: "pending" },
  { id: "validate_replay", label: "Validating market replay data", status: "pending" },
  { id: "policy_api", label: "Loading PPO policy", status: "pending" },
  { id: "portfolio", label: "Initializing paper portfolio", status: "pending" },
  { id: "session", label: "Preparing dashboard session", status: "pending" },
];

function freshSteps(): BootStep[] {
  return BOOT_STEPS.map((s) => ({ ...s, status: "pending" as BootStepStatus }));
}

export const useBootStore = create<BootState>((set, get) => ({
  phase: "idle",
  steps: freshSteps(),
  bootLogs: [],
  bootError: null,
  marketDataStatus: "pending",
  policyApiStatus: "pending",
  portfolioInitStatus: "pending",
  policyRetryAttempt: 0,
  policyRetryMax: 5,
  warmingMessage: null,
  bootRunId: 0,

  setPhase: (phase) => set({ phase }),
  setStepStatus: (id, status) =>
    set((s) => ({
      steps: s.steps.map((step) => (step.id === id ? { ...step, status } : step)),
    })),
  setMarketDataStatus: (marketDataStatus) => set({ marketDataStatus }),
  setPolicyApiStatus: (policyApiStatus) => set({ policyApiStatus }),
  setPortfolioInitStatus: (portfolioInitStatus) => set({ portfolioInitStatus }),
  setBootError: (bootError) => set({ bootError }),
  setPolicyRetry: (policyRetryAttempt, policyRetryMax) =>
    set({ policyRetryAttempt, policyRetryMax }),
  setWarmingMessage: (warmingMessage) => set({ warmingMessage }),
  appendLog: (message, level = "info") =>
    set((s) => ({
      bootLogs: [
        ...s.bootLogs,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          time: new Date().toISOString(),
          message,
          level,
        },
      ].slice(-80),
    })),
  resetBoot: () =>
    set({
      phase: "idle",
      steps: freshSteps(),
      bootLogs: [],
      bootError: null,
      marketDataStatus: "pending",
      policyApiStatus: "pending",
      portfolioInitStatus: "pending",
      policyRetryAttempt: 0,
      warmingMessage: null,
    }),
  bumpBootRun: () => {
    const next = get().bootRunId + 1;
    set({ bootRunId: next });
    return next;
  },
}));

export function isBootReady(): boolean {
  return useBootStore.getState().phase === "ready";
}
