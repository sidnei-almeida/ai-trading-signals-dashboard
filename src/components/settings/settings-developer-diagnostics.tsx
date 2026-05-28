"use client";

import { useDashboardStore } from "@/store/dashboard-store";

export function SettingsDeveloperDiagnostics() {
  const { health, dashboard, error, replayActive, replayIndex, replayTotal } =
    useDashboardStore();

  return (
    <details className="rounded-lg border border-zinc-800/90 bg-[#11151a]/90">
      <summary className="cursor-pointer px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 marker:content-none [&::-webkit-details-marker]:hidden">
        Developer diagnostics
      </summary>
      <div className="grid gap-2 border-t border-zinc-800/80 px-4 py-3 font-mono text-[10px] text-zinc-500 sm:grid-cols-2 lg:grid-cols-4">
        <p>
          Health: {health?.status ?? "—"} · live={String(health?.isLive ?? false)}
        </p>
        <p>Dashboard: {dashboard?.source ?? "—"}</p>
        <p>Model loaded: {String(health?.model_loaded ?? false)}</p>
        <p>
          Replay: {replayActive ? `active #${replayIndex}/${replayTotal}` : "idle"}
        </p>
        {error ? <p className="col-span-full text-red-400/80">Error: {error}</p> : null}
      </div>
    </details>
  );
}
