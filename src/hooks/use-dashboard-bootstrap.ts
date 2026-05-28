"use client";

import { useEffect, useRef } from "react";

import { useDashboardActions } from "@/hooks/use-dashboard-actions";
import { useReplayEngine } from "@/hooks/use-replay-engine";
import { useDashboardStore } from "@/store/dashboard-store";

export function useDashboardBootstrap() {
  const { refresh, runInference } = useDashboardActions();
  const { tickReplay } = useReplayEngine();
  const { agentState, settings, addActivity } = useDashboardStore();
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    void (async () => {
      try {
        await refresh();
        const dash = useDashboardStore.getState().dashboard;
        if (dash?.source === "stooq_historical" && dash.data) {
          addActivity({
            id: `boot-${Date.now()}`,
            time: new Date().toISOString(),
            source: "Stooq Historical Data",
            symbol: "PORTFOLIO",
            event: "Historical market replay data loaded",
            signal: "—",
            confidence: null,
            riskCheck: "OK",
            action: "INFO",
            status: "simulated",
          });
          await runInference();
        } else if (dash && !dash.isLive) {
          addActivity({
            id: `boot-${Date.now()}`,
            time: new Date().toISOString(),
            source: "System",
            symbol: "PORTFOLIO",
            event: dash.error ?? "Market data unavailable",
            signal: "—",
            confidence: null,
            riskCheck: "—",
            action: "INFO",
            status: "simulated",
          });
        }
      } catch {
        // refresh sets error state
      }
    })();
  }, [refresh, runInference, addActivity]);

  useEffect(() => {
    if (agentState !== "running") return;

    const id = setInterval(() => {
      void (async () => {
        try {
          const continued = await tickReplay();
          if (!continued) {
            useDashboardStore.getState().setAgentState("stopped");
          }
        } catch (e) {
          console.error("[Replay] interval error:", e);
          useDashboardStore.getState().setAgentState("stopped");
        }
      })();
    }, settings.replayTickMs);

    return () => clearInterval(id);
  }, [agentState, tickReplay, settings.replayTickMs]);
}
