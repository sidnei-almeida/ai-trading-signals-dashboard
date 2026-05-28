"use client";

import { useEffect, useRef } from "react";

import { useReplayEngine } from "@/hooks/use-replay-engine";
import { isBootReady } from "@/store/boot-store";
import { useDashboardStore } from "@/store/dashboard-store";

/** Agent replay tick loop — runs only after boot completes. */
export function useDashboardBootstrap() {
  const { tickReplay } = useReplayEngine();
  const { agentState, settings } = useDashboardStore();
  const booted = useRef(false);

  useEffect(() => {
    if (!isBootReady() || booted.current) return;
    booted.current = true;
  }, []);

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
