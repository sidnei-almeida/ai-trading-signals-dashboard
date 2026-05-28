import type { StooqReplayEngine } from "@/lib/stooq-replay";

/** Shared replay engine — must be singleton across hooks/components. */
let sharedEngine: StooqReplayEngine | null = null;

export function getSharedReplayEngine(): StooqReplayEngine | null {
  return sharedEngine;
}

export function setSharedReplayEngine(engine: StooqReplayEngine | null): void {
  sharedEngine = engine;
}

export function clearSharedReplayEngine(): void {
  sharedEngine = null;
}
