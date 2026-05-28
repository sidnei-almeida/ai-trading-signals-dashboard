"use client";

import { useEffect, useState } from "react";

import { Panel } from "@/components/dashboard/panel";
import { SettingRow, SpecLine } from "@/components/settings/settings-form";
import { fetchMarketDataBff } from "@/lib/api-bff";
import { dataSourceDisplayLabel } from "@/lib/market-watch";
import { useReplayEngine } from "@/hooks/use-replay-engine";
import { useDashboardStore } from "@/store/dashboard-store";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function SettingsReplayDataCard() {
  const { settings, setSettings, dashboard, replayActive, replayIndex, replayTotal } =
    useDashboardStore();
  const { startReplay } = useReplayEngine();
  const [csvLoaded, setCsvLoaded] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMarketDataBff()
      .then((p) => {
        if (!cancelled) setCsvLoaded(p.rows.length > 0);
      })
      .catch(() => {
        if (!cancelled) setCsvLoaded(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const source = dashboard?.data?.data_source;
  const replayDate =
    dashboard?.data?.price_history[replayIndex]?.Date ?? "—";

  return (
    <Panel
      title="Replay & Data Source"
      subtitle="Historical market replay · local CSV"
      className="h-full"
      bodyClassName="flex h-full min-h-0 flex-col gap-3 p-3"
    >
      <div className="grid gap-1.5 rounded-md border border-zinc-800/70 bg-zinc-950/40 px-2.5 py-2">
        <SpecLine
          label="Active source"
          value={source ? dataSourceDisplayLabel(source) : "—"}
        />
        <SpecLine
          label="Local CSV"
          value={csvLoaded === true ? "prices.csv loaded" : csvLoaded === false ? "missing" : "…"}
        />
        <SpecLine
          label="Replay position"
          value={
            replayTotal > 0
              ? `#${replayIndex} / ${replayTotal - 1} · ${replayDate}`
              : "Not started"
          }
        />
      </div>
      <SettingRow label="Replay tick interval (ms)" value={String(settings.replayTickMs)}>
        <Input
          type="number"
          className="h-8 font-mono text-xs"
          value={settings.replayTickMs}
          onChange={(e) => setSettings({ replayTickMs: Number(e.target.value) })}
        />
      </SettingRow>
      <SettingRow label="Starting cash">
        <Input
          type="number"
          className="h-8 font-mono text-xs"
          value={settings.startingCash}
          onChange={(e) => setSettings({ startingCash: Number(e.target.value) })}
        />
      </SettingRow>
      <SettingRow label="Data source preference">
        <Select
          value={settings.dataSourcePreference}
          onValueChange={(v) =>
            setSettings({ dataSourcePreference: v as "api" | "auto" })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto (API then fallback)</SelectItem>
            <SelectItem value="api">Prefer API</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <p className="text-[10px] leading-snug text-zinc-600">
        Historical Market Replay · Local CSV runtime · No live broker execution
      </p>
      <Button
        size="sm"
        variant="outline"
        className="mt-auto h-7 w-full text-xs"
        disabled={replayActive}
        onClick={() => void startReplay().catch(() => undefined)}
      >
        Start historical replay
      </Button>
    </Panel>
  );
}
