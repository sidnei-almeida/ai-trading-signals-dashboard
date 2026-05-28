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
import { OPERATING_MODES } from "@/lib/operating-modes";
import { isBootReady } from "@/store/boot-store";
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
    strategyMode,
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
      if (!isBootReady()) {
        const message = "Boot sequence incomplete. Market data and PPO API must be ready.";
        setError(message);
        addActivity({
          id: `start-err-${Date.now()}`,
          time: new Date().toISOString(),
          source: "Operator",
          symbol: "PORTFOLIO",
          event: message,
          signal: "—",
          confidence: null,
          riskCheck: "Blocked",
          action: "START",
          status: "blocked",
        });
        return;
      }

      if (!health?.isLive || !health.model_loaded) {
        const message = "PPO policy API is not ready. Inference is disabled.";
        setError(message);
        addActivity({
          id: `start-err-${Date.now()}`,
          time: new Date().toISOString(),
          source: "Operator",
          symbol: "PORTFOLIO",
          event: message,
          signal: "—",
          confidence: null,
          riskCheck: "Blocked",
          action: "START",
          status: "blocked",
        });
        return;
      }

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
          <span className="label">Data:</span>
          <span className={cn("value", dashboard?.data && "active")}>
            {dashboard?.source === "stooq_historical"
              ? "Stooq Historical Replay"
              : dashboard?.source === "demo_fallback"
                ? "Demo fallback"
                : (dashboard?.data?.data_source ?? "—")}
            {dashboard?.data ? " · Ready" : ""}
          </span>
        </span>
        <span>
          <span className="label">API:</span>
          <span
            className={cn(
              "value",
              health?.isLive && health.model_loaded ? "active" : "offline",
            )}
          >
            {health?.isLive && health.model_loaded
              ? "FinSight API · Online"
              : "FinSight API · Offline"}
          </span>
        </span>
        <span>
          <span className="label">Mode:</span>
          <span className="value">{OPERATING_MODES[strategyMode].label}</span>
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
