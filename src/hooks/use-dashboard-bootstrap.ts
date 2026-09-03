"use client";

import { useEffect, useRef } from "react";

import { useReplayEngine } from "@/hooks/use-replay-engine";
import { isBootReady, useBootStore } from "@/store/boot-store";
import { useDashboardStore } from "@/store/dashboard-store";

/** Agent replay tick loop — runs only after boot completes. */
export function useDashboardBootstrap() {
  const { startReplay, tickReplay } = useReplayEngine();
  const { agentState, settings } = useDashboardStore();
  const bootPhase = useBootStore((s) => s.phase);
  const autoStarted = useRef(false);

  // Start the session as soon as boot finishes, so the feed is live without
  // the operator pressing Start. Guarded by a ref so a later Stop sticks.
  useEffect(() => {
    if (bootPhase !== "ready") return;
    if (!settings.autoStartAgent) return;
    if (autoStarted.current) return;
    autoStarted.current = true;

    void (async () => {
      try {
        await startReplay();
        useDashboardStore.getState().setAgentState("running");
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to auto-start agent session";
        console.error("[Bootstrap] auto-start failed:", message);
        useDashboardStore.getState().setError(message);
      }
    })();
  }, [bootPhase, settings.autoStartAgent, startReplay]);

  useEffect(() => {
    if (!isBootReady()) return;
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
