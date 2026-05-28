"use client";

import { useCallback } from "react";

import { resolveFromDashboard } from "@/lib/allocation-targets";
import { fetchMarketDataBff, fetchPredictBff } from "@/lib/api-bff";
import {
  clearSharedReplayEngine,
  getSharedReplayEngine,
  setSharedReplayEngine,
} from "@/lib/replay-session";
import { deriveAiSignal } from "@/lib/signal-engine";
import { StooqReplayEngine } from "@/lib/stooq-replay";
import { useDashboardStore } from "@/store/dashboard-store";
import type { LiveReplayPoint } from "@/types/rl-trading";

function livePointFromEngine(engine: StooqReplayEngine): LiveReplayPoint | null {
  const snap = engine.snapshot();
  if (!snap) return null;
  const row = engine.rows[engine.currentIndex];
  return {
    index: engine.currentIndex,
    date: row?.date ?? "",
    agent: snap.portfolioValue,
    benchmark: snap.benchmarkValue,
  };
}

export function useReplayEngine() {
  const {
    setLastPrediction,
    setReplayProgress,
    setError,
    addActivity,
    appendLiveReplayPoint,
    clearLiveReplay,
    updateCurrentAllocation,
    settings,
    setHistoricalChart,
  } = useDashboardStore();

  const recordLivePoint = useCallback(
    (engine: StooqReplayEngine) => {
      const point = livePointFromEngine(engine);
      if (!point) return;
      appendLiveReplayPoint(point);
      const snap = engine.snapshot();
      if (snap) {
        updateCurrentAllocation(snap.portfolio.allocation);
      }
      setReplayProgress(engine.currentIndex, engine.rowCount, true);
    },
    [appendLiveReplayPoint, updateCurrentAllocation, setReplayProgress],
  );

  const loadEngine = useCallback(async () => {
    const market = await fetchMarketDataBff();
    if (market.rows.length === 0) {
      throw new Error(
        "Market data not loaded. Run npm run data:stooq or check GET /api/market-data.",
      );
    }
    const engine = new StooqReplayEngine(market.rows, settings.startingCash);
    setSharedReplayEngine(engine);
    return engine;
  }, [settings.startingCash]);

  const startReplay = useCallback(async () => {
    setError(null);

    const state = useDashboardStore.getState();
    const dash = state.dashboard?.data;

    if (dash && !state.historicalChart) {
      setHistoricalChart({
        agent_history: [...dash.agent_history],
        benchmark_history: [...dash.benchmark_history],
        dates: dash.price_history.map((p) => p.Date),
      });
    }

    let engine = getSharedReplayEngine();
    if (!engine) {
      engine = await loadEngine();
    }

    engine.reset();
    clearLiveReplay();
    setReplayProgress(0, engine.rowCount, true);
    recordLivePoint(engine);

    addActivity({
      id: `replay-start-${Date.now()}`,
      time: new Date().toISOString(),
      source: "Operator",
      symbol: "PORTFOLIO",
      event: "Agent session started",
      signal: "—",
      confidence: null,
      riskCheck: "OK",
      action: "START",
      status: "simulated",
    });

    return engine;
  }, [
    loadEngine,
    clearLiveReplay,
    recordLivePoint,
    addActivity,
    setError,
    setHistoricalChart,
    setReplayProgress,
  ]);

  const tickReplay = useCallback(async () => {
    const engine = getSharedReplayEngine();
    if (!engine) {
      console.error("[Replay] tick skipped: no shared engine (did Start Agent run?)");
      return false;
    }

    const snap = engine.snapshot();
    if (!snap) {
      console.error("[Replay] tick skipped: empty snapshot at index", engine.currentIndex);
      return false;
    }

    try {
      const prediction = await fetchPredictBff([...snap.observation]);
      setLastPrediction(prediction);

      const dashData = useDashboardStore.getState().dashboard?.data;
      const strategyMode = useDashboardStore.getState().strategyMode;
      const targets = dashData
        ? resolveFromDashboard(
            dashData,
            prediction.result.allocations,
            strategyMode,
          ).adjustedTargets
        : prediction.result.allocations;

      engine.applyTargets(targets);

      if (!engine.advance()) {
        recordLivePoint(engine);
        setReplayProgress(engine.currentIndex, engine.rowCount, false);
        addActivity({
          id: `replay-end-${Date.now()}`,
          time: new Date().toISOString(),
          source: "Historical Market Replay",
          symbol: "PORTFOLIO",
          event: "Historical replay completed",
          signal: "Hold",
          confidence: null,
          riskCheck: "—",
          action: "STOP",
          status: "simulated",
        });
        return false;
      }

      recordLivePoint(engine);

      const hist = useDashboardStore.getState().historicalChart;
      const live = useDashboardStore.getState().liveReplayPoints;
      const lastLive = live[live.length - 1];
      const benchAtStart = hist?.benchmark_history[0] ?? 1;
      const agentAtStart = hist?.agent_history[0] ?? 1;

      if (dashData) {
        const resolved = resolveFromDashboard(
          dashData,
          prediction.result.allocations,
          strategyMode,
        );
        const ai = deriveAiSignal(dashData, resolved.adjustedTargets, {
          agentReturn: lastLive
            ? (lastLive.agent - agentAtStart) / agentAtStart
            : 0,
          benchmarkReturn: lastLive
            ? (lastLive.benchmark - benchAtStart) / benchAtStart
            : 0,
          strategyMode,
          strategyModeLabel: resolved.modeConfig.label,
        });

        addActivity({
          id: `replay-${Date.now()}`,
          time: new Date().toISOString(),
          source: prediction.isLive ? "PPO Policy Inference" : "Demo fallback",
          symbol: ai.focusAsset,
          event: `Historical tick · ${lastLive?.date ?? "—"}`,
          signal: ai.mainSignalLabel,
          confidence: ai.confidence,
          riskCheck: "Paper trading",
          action: "REBALANCE",
          status: "simulated",
        });
      }

      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Replay tick failed";
      console.error("[Replay] tick error:", message);
      setError(message);
      addActivity({
        id: `replay-err-${Date.now()}`,
        time: new Date().toISOString(),
        source: "System",
        symbol: "PORTFOLIO",
        event: message,
        signal: "—",
        confidence: null,
        riskCheck: "Error",
        action: "ERROR",
        status: "blocked",
      });
      return false;
    }
  }, [
    recordLivePoint,
    setLastPrediction,
    addActivity,
    setReplayProgress,
    setError,
  ]);

  const clearEngine = useCallback(() => {
    clearSharedReplayEngine();
  }, []);

  return { startReplay, tickReplay, loadEngine, clearEngine };
}
