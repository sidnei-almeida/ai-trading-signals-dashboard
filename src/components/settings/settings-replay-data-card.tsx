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
import { Switch } from "@/components/ui/switch";

/** "2026-09-02 · 1 day old" — makes a stale ingest obvious at a glance. */
function describeCoverage(lastDate: string): string {
  const last = new Date(`${lastDate}T00:00:00Z`);
  const today = new Date();
  const days = Math.floor(
    (Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) -
      last.getTime()) /
      86_400_000,
  );
  if (!Number.isFinite(days)) return lastDate;
  if (days <= 0) return `${lastDate} · today`;
  if (days === 1) return `${lastDate} · 1 day old`;
  if (days < 90) return `${lastDate} · ${days} days old`;
  return `${lastDate} · ${Math.floor(days / 30)} months old`;
}

export function SettingsReplayDataCard() {
  const { settings, setSettings, dashboard, replayActive, replayIndex, replayTotal } =
    useDashboardStore();
  const { startReplay } = useReplayEngine();
  const [barStore, setBarStore] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMarketDataBff()
      .then((p) => {
        if (cancelled) return;
        if (p.rows.length === 0) {
          setBarStore("empty");
          setCoverage("no bars");
          return;
        }
        setBarStore(`${p.source} · ${p.rows.length} bars`);
        setCoverage(describeCoverage(p.rows[p.rows.length - 1].date));
      })
      .catch(() => {
        if (cancelled) return;
        setBarStore("unavailable");
        setCoverage(null);
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
        <SpecLine label="Bar storage" value={barStore ?? "…"} />
        <SpecLine label="Latest bar" value={coverage ?? "…"} />
        <SpecLine
          label="Replay position"
          value={
            replayTotal > 0
              ? `#${replayIndex} / ${replayTotal - 1} · ${replayDate}`
              : "Not started"
          }
        />
      </div>
      <SettingRow
        label="Auto-start on load"
        value={settings.autoStartAgent ? "On" : "Off"}
      >
        <Switch
          checked={settings.autoStartAgent}
          onCheckedChange={(autoStartAgent) => setSettings({ autoStartAgent })}
        />
      </SettingRow>
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
