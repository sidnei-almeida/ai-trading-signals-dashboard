"use client";

import { Panel } from "@/components/dashboard/panel";
import { SpecLine } from "@/components/settings/settings-form";
import { getOperatingModeConfig } from "@/lib/operating-modes";
import { dataSourceDisplayLabel } from "@/lib/market-watch";
import { useDashboardStore } from "@/store/dashboard-store";

function SummaryColumn({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-2 border-zinc-800/50 lg:border-l lg:pl-4 first:lg:border-l-0 first:lg:pl-0">{children}</div>;
}

export function SettingsSummaryCard() {
  const { strategyMode, guardrails, settings, dashboard } = useDashboardStore();
  const mode = getOperatingModeConfig(strategyMode);
  const source = dashboard?.data?.data_source;

  return (
    <Panel
      title="Active Configuration"
      subtitle="Effective profile snapshot"
      className="w-full"
      bodyClassName="p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <SummaryColumn>
          <SpecLine label="Mode" value={mode.label} />
          <SpecLine
            label="Rebalance intensity"
            value={`${(mode.rebalanceIntensity * 100).toFixed(0)}%`}
          />
        </SummaryColumn>
        <SummaryColumn>
          <SpecLine
            label="Max single asset"
            value={`${(guardrails.maxSingleAssetAllocation * 100).toFixed(0)}%`}
          />
          <SpecLine label="Max step" value={`${(guardrails.maxRebalanceSize * 100).toFixed(0)}%`} />
        </SummaryColumn>
        <SummaryColumn>
          <SpecLine label="Cash reserve" value={`${(guardrails.cashReservePct * 100).toFixed(0)}%`} />
          <SpecLine
            label="Concentration"
            value={`${(guardrails.concentrationLimit * 100).toFixed(0)}%`}
          />
        </SummaryColumn>
        <SummaryColumn>
          <SpecLine label="Data source" value={source ? dataSourceDisplayLabel(source) : "—"} />
          <SpecLine label="Replay tick" value={`${settings.replayTickMs} ms`} />
        </SummaryColumn>
        <SummaryColumn>
          <SpecLine
            label="Execution"
            value={settings.operatingMode === "paper" ? "Paper trading" : "Demo"}
          />
          <SpecLine label="Starting cash" value={`$${settings.startingCash.toLocaleString()}`} />
        </SummaryColumn>
      </div>
    </Panel>
  );
}
