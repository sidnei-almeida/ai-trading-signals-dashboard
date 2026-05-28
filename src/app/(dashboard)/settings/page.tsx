"use client";

import { SettingsAgentRuntimeCard } from "@/components/settings/settings-agent-runtime-card";
import { SettingsApiSessionCard } from "@/components/settings/settings-api-session-card";
import { SettingsDeveloperDiagnostics } from "@/components/settings/settings-developer-diagnostics";
import { SettingsGuardrailsCard } from "@/components/settings/settings-guardrails-card";
import { SettingsOperatingModeCard } from "@/components/settings/settings-operating-mode-card";
import { SettingsReplayDataCard } from "@/components/settings/settings-replay-data-card";
import { SettingsSafetyCard } from "@/components/settings/settings-safety-card";
import { SettingsSummaryCard } from "@/components/settings/settings-summary-card";
import { getOperatingModeConfig } from "@/lib/operating-modes";
import { useDashboardStore } from "@/store/dashboard-store";
import type { StrategyMode } from "@/types/rl-trading";

export default function SettingsPage() {
  const { setStrategyMode, addActivity } = useDashboardStore();

  const onModeChange = (mode: StrategyMode) => {
    setStrategyMode(mode);
    const label = getOperatingModeConfig(mode).label;
    addActivity({
      id: crypto.randomUUID(),
      time: new Date().toISOString(),
      source: "Operator",
      symbol: "PORTFOLIO",
      event: `Operating mode changed to ${label}`,
      signal: "—",
      confidence: null,
      riskCheck: "Applied",
      action: "MODE_CHANGE",
      status: "simulated",
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h2 className="text-sm font-semibold text-zinc-100">Settings</h2>
        <p className="text-[11px] text-zinc-500">
          Configuration control room — modes, guardrails, API, replay, and session safety.
        </p>
      </header>

      <div className="grid items-stretch gap-4 lg:grid-cols-[1.1fr_1.3fr_1.1fr]">
        <SettingsOperatingModeCard onModeChange={onModeChange} />
        <SettingsGuardrailsCard />
        <SettingsApiSessionCard />
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-3">
        <SettingsReplayDataCard />
        <SettingsAgentRuntimeCard />
        <SettingsSafetyCard />
      </div>

      <SettingsSummaryCard />

      <p className="text-[10px] leading-relaxed text-zinc-600">
        Research and education only. Simulated execution — not financial advice. Risk Controls
        monitors utilization; Settings configures limits and session behavior.
      </p>

      <SettingsDeveloperDiagnostics />
    </div>
  );
}
