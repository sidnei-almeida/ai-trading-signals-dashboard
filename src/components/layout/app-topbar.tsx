"use client";

import {
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Scale,
  Square,
} from "lucide-react";

import { StrategyModeControl } from "@/components/layout/strategy-mode-control";
import { useDashboardActions } from "@/hooks/use-dashboard-actions";
import { useReplayEngine } from "@/hooks/use-replay-engine";
import { useDashboardStore } from "@/store/dashboard-store";
import type { ActivityEvent } from "@/types/rl-trading";
import { cn } from "@/lib/utils";

const TOPBAR_BADGES = [
  { label: "PPO Policy", active: true },
  { label: "ONNX Runtime", active: false },
  { label: "Paper Trading", active: true },
  { label: "S&P 500 Universe", active: false },
] as const;

export function AppTopbar() {
  const { refresh, runInference } = useDashboardActions();
  const { startReplay } = useReplayEngine();
  const {
    agentState,
    setAgentState,
    resetSession,
    addActivity,
    dashboard,
    health,
    replayIndex,
    replayTotal,
    replayActive,
    setError,
  } = useDashboardStore();

  const logAction = (
    event: string,
    action: string,
    signal = "—",
    symbol = "PORTFOLIO",
  ) => {
    const entry: ActivityEvent = {
      id: `action-${Date.now()}`,
      time: new Date().toISOString(),
      source: "Operator",
      symbol,
      event,
      signal,
      confidence: null,
      riskCheck: "Manual",
      action,
      status: "simulated",
    };
    addActivity(entry);
  };

  const handleStartAgent = () => {
    void (async () => {
      if (agentState === "paused") {
        setAgentState("running");
        logAction("Agent session resumed", "START", "Rebalance");
        return;
      }

      try {
        await startReplay();
        setAgentState("running");
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to start agent session";
        console.error("[Start Agent]", message);
        setError(message);
        addActivity({
          id: `start-err-${Date.now()}`,
          time: new Date().toISOString(),
          source: "Operator",
          symbol: "PORTFOLIO",
          event: message,
          signal: "—",
          confidence: null,
          riskCheck: "Error",
          action: "START",
          status: "blocked",
        });
      }
    })();
  };

  const agentValueClass =
    agentState === "running"
      ? "active"
      : agentState === "stopped"
        ? "stopped"
        : "";

  return (
    <header className="dash-topbar">
      <div className="topbar-main">
        <div className="topbar-brand">
          <div className="topbar-brand-text min-w-0">
            <span className="dash-topbar-title">RL Portfolio Allocation Dashboard</span>
            <p className="dash-topbar-subtitle">
              PPO-based portfolio allocation, historical market replay, and paper-trading
              simulation.
            </p>
          </div>
          <div className="topbar-nav-tabs">
            {TOPBAR_BADGES.map(({ label, active }) => (
              <span key={label} className={cn("nav-tab", active && "active")}>
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="topbar-actions">
          <StrategyModeControl />
          <button
            type="button"
            className="btn-start"
            onClick={handleStartAgent}
            disabled={agentState === "running"}
          >
            <Play className="size-3.5" />
            Start Agent
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setAgentState("paused");
              logAction("Session paused", "PAUSE", "Hold");
            }}
            disabled={agentState !== "running"}
          >
            <Pause className="size-3.5" />
            Pause
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              resetSession();
              logAction("Session reset", "RESET", "—");
              void refresh();
            }}
          >
            <RotateCcw className="size-3.5" />
            Reset Session
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              logAction("Rebalance simulation triggered", "REBALANCE", "Rebalance");
              void runInference();
            }}
          >
            <Scale className="size-3.5" />
            Rebalance Simulation
          </button>
          <button
            type="button"
            className="btn-emergency"
            onClick={() => {
              setAgentState("stopped");
              logAction("Emergency stop triggered", "E-STOP", "Hold");
            }}
          >
            <Square className="size-3.5" />
            Emergency Stop
          </button>
          <button
            type="button"
            className="btn-secondary px-2"
            onClick={() => void refresh()}
            aria-label="Refresh dashboard"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="status-line">
        <span>
          <span className="label">API:</span>
          <span className={cn("value", health?.isLive && "active")}>
            {health?.isLive ? "FinSight API" : "Demo fallback"}
          </span>
        </span>
        <span>
          <span className="label">Data:</span>
          <span className="value">
            {dashboard?.source === "stooq_historical"
              ? "Stooq Historical Replay"
              : (dashboard?.data?.data_source ?? "—")}
          </span>
        </span>
        <span>
          <span className="label">Agent:</span>
          <span className={cn("value capitalize", agentValueClass)}>
            {agentState}
            {replayTotal > 0 ? (
              <>
                {" "}
                · day {replayIndex + 1}/{replayTotal}
                {replayActive ? "" : " (end)"}
              </>
            ) : null}
          </span>
        </span>
      </div>
    </header>
  );
}
