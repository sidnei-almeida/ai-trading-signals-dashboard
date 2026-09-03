"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { guardrailsFromMode } from "@/lib/operating-modes";
import { clearSharedReplayEngine } from "@/lib/replay-session";
import type {
  ActivityEvent,
  AllocationWeights,
  DashboardDataEnvelope,
  GuardrailConfig,
  HistoricalChartSnapshot,
  LiveReplayPoint,
  PredictionEnvelope,
  SessionSettings,
  StrategyMode,
} from "@/types/rl-trading";

export type AgentRunState = "stopped" | "running" | "paused";

interface DashboardState {
  settings: SessionSettings;
  /** Conservative / Balanced / Aggressive risk profile */
  strategyMode: StrategyMode;
  guardrails: GuardrailConfig;
  agentState: AgentRunState;
  dashboard: DashboardDataEnvelope | null;
  health: { model_loaded: boolean; isLive: boolean; status: string } | null;
  lastPrediction: PredictionEnvelope | null;
  activityLog: ActivityEvent[];
  isLoading: boolean;
  error: string | null;
  /** Full historical curves — never shortened by live replay */
  historicalChart: HistoricalChartSnapshot | null;
  /** Live session points appended during agent replay */
  liveReplayPoints: LiveReplayPoint[];
  replayActive: boolean;
  replayIndex: number;
  replayTotal: number;

  setSettings: (partial: Partial<SessionSettings>) => void;
  setStrategyMode: (mode: StrategyMode) => void;
  setGuardrails: (partial: Partial<GuardrailConfig>) => void;
  setAgentState: (state: AgentRunState) => void;
  setDashboard: (envelope: DashboardDataEnvelope | null) => void;
  setHistoricalChart: (chart: HistoricalChartSnapshot | null) => void;
  appendLiveReplayPoint: (point: LiveReplayPoint) => void;
  clearLiveReplay: () => void;
  updateCurrentAllocation: (allocation: AllocationWeights) => void;
  setHealth: (health: DashboardState["health"]) => void;
  setLastPrediction: (prediction: PredictionEnvelope | null) => void;
  addActivity: (event: ActivityEvent) => void;
  clearActivity: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setReplayProgress: (index: number, total: number, active: boolean) => void;
  resetSession: () => void;
}

const defaultSettings: SessionSettings = {
  operatingMode: "paper",
  rebalanceIntervalMinutes: 15,
  startingCash: 100_000,
  dataSourcePreference: "auto",
  replayTickMs: 2000,
  autoStartAgent: true,
};

function snapshotFromEnvelope(
  envelope: DashboardDataEnvelope,
): HistoricalChartSnapshot | null {
  const data = envelope.data;
  if (!data || data.agent_history.length < 2) return null;
  return {
    agent_history: [...data.agent_history],
    benchmark_history: [...data.benchmark_history],
    dates: data.price_history.map((p) => p.Date),
  };
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      strategyMode: "balanced",
      guardrails: guardrailsFromMode("balanced"),
      agentState: "stopped",
      dashboard: null,
      health: null,
      lastPrediction: null,
      activityLog: [],
      isLoading: false,
      error: null,
      historicalChart: null,
      liveReplayPoints: [],
      replayActive: false,
      replayIndex: 0,
      replayTotal: 0,

      setSettings: (partial) =>
        set((s) => ({ settings: { ...s.settings, ...partial } })),
      setStrategyMode: (strategyMode) =>
        set({
          strategyMode,
          guardrails: guardrailsFromMode(strategyMode),
        }),
      setGuardrails: (partial) =>
        set((s) => ({ guardrails: { ...s.guardrails, ...partial } })),
      setAgentState: (agentState) => set({ agentState }),
      setDashboard: (dashboard) =>
        set((s) => {
          if (!dashboard?.data) {
            return { dashboard };
          }
          const snapshot = snapshotFromEnvelope(dashboard);
          const shouldCapture =
            snapshot != null &&
            (s.liveReplayPoints.length === 0 || !s.replayActive);
          return {
            dashboard,
            historicalChart: shouldCapture
              ? snapshot
              : s.historicalChart,
          };
        }),
      setHistoricalChart: (historicalChart) => set({ historicalChart }),
      appendLiveReplayPoint: (point) =>
        set((s) => ({
          liveReplayPoints: [...s.liveReplayPoints, point],
        })),
      clearLiveReplay: () => set({ liveReplayPoints: [] }),
      updateCurrentAllocation: (allocation) =>
        set((s) => {
          if (!s.dashboard?.data) return s;
          return {
            dashboard: {
              ...s.dashboard,
              data: { ...s.dashboard.data, current_allocation: allocation },
            },
          };
        }),
      setHealth: (health) => set({ health }),
      setLastPrediction: (lastPrediction) => set({ lastPrediction }),
      addActivity: (event) =>
        set((s) => ({
          activityLog: [event, ...s.activityLog].slice(0, 200),
        })),
      clearActivity: () => set({ activityLog: [] }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setReplayProgress: (replayIndex, replayTotal, replayActive) =>
        set({ replayIndex, replayTotal, replayActive }),
      resetSession: () => {
        clearSharedReplayEngine();
        set({
          agentState: "stopped",
          lastPrediction: null,
          activityLog: [],
          error: null,
          liveReplayPoints: [],
          replayActive: false,
          replayIndex: 0,
          replayTotal: 0,
        });
      },
    }),
    {
      name: "quant-signal-dashboard",
      partialize: (s) => ({
        settings: s.settings,
        strategyMode: s.strategyMode,
        guardrails: s.guardrails,
      }),
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<DashboardState>) };
        const mode = merged.strategyMode ?? "balanced";
        return {
          ...merged,
          // Sessions persisted before a setting existed would drop it entirely.
          settings: { ...defaultSettings, ...merged.settings },
          strategyMode: mode,
          guardrails: guardrailsFromMode(mode),
        };
      },
    },
  ),
);
