"use client";

import { Panel } from "@/components/dashboard/panel";
import { SettingRow } from "@/components/settings/settings-form";
import { useDashboardStore } from "@/store/dashboard-store";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-800/60 bg-zinc-950/50 px-2.5 py-2">
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-medium text-zinc-200">{value}</p>
    </div>
  );
}

export function SettingsGuardrailsCard() {
  const { guardrails, setGuardrails } = useDashboardStore();

  const maxAsset = `${Math.round(guardrails.maxSingleAssetAllocation * 100)}%`;
  const maxStep = `${Math.round(guardrails.maxRebalanceSize * 100)}%`;
  const cash = `${Math.round(guardrails.cashReservePct * 100)}%`;
  const concentration = `${Math.round(guardrails.concentrationLimit * 100)}%`;

  return (
    <Panel
      title="Risk & Guardrail Configuration"
      subtitle="Editable limits · Risk Controls monitors"
      className="h-full"
      bodyClassName="flex h-full min-h-0 flex-col gap-3 p-3"
    >
      <p className="text-[10px] leading-snug text-zinc-600">
        Mode presets apply on switch. Overrides persist until mode changes. These limits
        constrain simulated rebalancing and risk exposure.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <SettingRow label="Max single-asset allocation" value={maxAsset}>
          <Slider
            min={10}
            max={55}
            step={1}
            value={[guardrails.maxSingleAssetAllocation * 100]}
            onValueChange={([v]) =>
              setGuardrails({ maxSingleAssetAllocation: v / 100 })
            }
          />
        </SettingRow>
        <SettingRow label="Max rebalance step" value={maxStep}>
          <Slider
            min={5}
            max={30}
            step={1}
            value={[guardrails.maxRebalanceSize * 100]}
            onValueChange={([v]) => setGuardrails({ maxRebalanceSize: v / 100 })}
          />
        </SettingRow>
        <SettingRow label="Cash reserve %" value={cash}>
          <Input
            type="number"
            className="h-8 font-mono text-xs"
            value={Math.round(guardrails.cashReservePct * 100)}
            onChange={(e) =>
              setGuardrails({ cashReservePct: Number(e.target.value) / 100 })
            }
          />
        </SettingRow>
        <SettingRow label="Concentration limit %" value={concentration}>
          <Input
            type="number"
            className="h-8 font-mono text-xs"
            value={Math.round(guardrails.concentrationLimit * 100)}
            onChange={(e) =>
              setGuardrails({ concentrationLimit: Number(e.target.value) / 100 })
            }
          />
        </SettingRow>
      </div>

      <div className="mt-auto border-t border-zinc-800/70 pt-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Active limits
        </p>
        <div className="grid grid-cols-2 gap-2">
          <SummaryMetric label="Max single asset" value={maxAsset} />
          <SummaryMetric label="Max rebalance step" value={maxStep} />
          <SummaryMetric label="Cash reserve" value={cash} />
          <SummaryMetric label="Concentration limit" value={concentration} />
        </div>
      </div>
    </Panel>
  );
}
