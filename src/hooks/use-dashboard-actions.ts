"use client";

import { useCallback } from "react";

import { resolveFromDashboard } from "@/lib/allocation-targets";
import {
  buildObservationFromDashboard,
  portfolioMetrics,
} from "@/lib/dashboard-math";
import {
  fetchDashboardDataBff,
  fetchHealthBff,
  fetchPredictBff,
} from "@/lib/api-bff";
import { deriveAiSignal } from "@/lib/signal-engine";
import { useDashboardStore } from "@/store/dashboard-store";
import type { ActivityEvent } from "@/types/rl-trading";

export function useDashboardActions() {
  const {
    setDashboard,
    setHealth,
    setLastPrediction,
    setLoading,
    setError,
    addActivity,
    settings,
    strategyMode,
  } = useDashboardStore();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [health, dashboard] = await Promise.all([
        fetchHealthBff(),
        fetchDashboardDataBff(),
      ]);
      setHealth({
        status: health.status,
        model_loaded: health.model_loaded,
        isLive: health.isLive,
      });
      setDashboard(dashboard);
      const label =
        dashboard.source === "stooq_historical"
          ? "Stooq Historical Data"
          : dashboard.isLive
            ? "FinSight API"
            : "Market Data";
      addActivity({
        id: `refresh-${Date.now()}`,
        time: new Date().toISOString(),
        source: label,
        symbol: "PORTFOLIO",
        event:
          dashboard.source === "stooq_historical"
            ? "Historical market data loaded"
            : "Market data refreshed",
        signal: "—",
        confidence: null,
        riskCheck: "OK",
        action: "REFRESH",
        status: "simulated",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [setDashboard, setHealth, setLoading, setError, addActivity]);

  const runInference = useCallback(async () => {
    const dashboard = useDashboardStore.getState().dashboard?.data;
    if (!dashboard) return;

    const observation = buildObservationFromDashboard(
      dashboard,
      settings.startingCash * 0.1,
    );

    try {
      const prediction = await fetchPredictBff([...observation]);
      setLastPrediction(prediction);

      const m = portfolioMetrics(dashboard);
      const resolved = resolveFromDashboard(
        dashboard,
        prediction.result.allocations,
        strategyMode,
      );
      const ai = deriveAiSignal(dashboard, resolved.adjustedTargets, {
        agentReturn: m.agentReturn,
        benchmarkReturn: m.benchmarkReturn,
        strategyMode,
        strategyModeLabel: resolved.modeConfig.label,
      });

      const event: ActivityEvent = {
        id: `infer-${Date.now()}`,
        time: prediction.fetchedAt,
        source: prediction.isLive ? "PPO Policy Inference" : "Demo fallback",
        symbol: ai.focusAsset,
        event: "PPO target allocation updated",
        signal: ai.mainSignalLabel,
        confidence: ai.confidence,
        riskCheck: "Pending review",
        action: "REBALANCE",
        status: prediction.isLive ? "approved" : "simulated",
      };
      addActivity(event);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Inference failed");
    }
  }, [
    settings.startingCash,
    strategyMode,
    setLastPrediction,
    addActivity,
    setError,
  ]);

  return { refresh, runInference };
}
