"use client";

import { useState } from "react";

import { Panel } from "@/components/dashboard/panel";
import { SettingRow } from "@/components/settings/settings-form";
import { fetchHealthBff } from "@/lib/api-bff";
import { DEFAULT_API_URL, POLICY_MODEL_INFO } from "@/lib/constants";
import { useDashboardStore } from "@/store/dashboard-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function SessionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-zinc-800/60 bg-zinc-950/50 px-2.5 py-2">
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-200" title={value}>
        {value}
      </p>
    </div>
  );
}

export function SettingsApiSessionCard() {
  const { settings, setSettings, health } = useDashboardStore();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const apiStatus = health?.isLive
    ? "Reachable · model loaded"
    : health
      ? "Fallback / demo"
      : "Not checked";

  const host = settings.apiBaseUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const h = await fetchHealthBff();
      setTestResult(
        h.isLive ? `OK · ${h.status}` : `Unreachable · ${h.status ?? "unknown"}`,
      );
    } catch {
      setTestResult("Connection failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Panel
      title="API & Session"
      subtitle="FinSight backend · paper trading session"
      className="h-full"
      bodyClassName="flex h-full min-h-0 flex-col gap-3 p-3"
    >
      <SettingRow
        label="API base URL"
        hint={`NEXT_PUBLIC_RL_TRADING_API_URL · default ${DEFAULT_API_URL.replace(/^https?:\/\//, "")}`}
      >
        <Input
          className="h-8 font-mono text-xs"
          value={settings.apiBaseUrl}
          onChange={(e) => setSettings({ apiBaseUrl: e.target.value })}
        />
      </SettingRow>

      <div className="grid gap-3 sm:grid-cols-2">
        <SettingRow label="Trading session">
          <Select
            value={settings.operatingMode}
            onValueChange={(v) => setSettings({ operatingMode: v as "paper" | "demo" })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paper">Paper Trading (research demo)</SelectItem>
              <SelectItem value="demo">Demo</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Inference route">
          <p className="font-mono text-[10px] leading-snug text-zinc-400">
            POST /api/predict
            <br />
            BFF → {host || "—"}
          </p>
        </SettingRow>
      </div>

      <div className="rounded-md border border-zinc-800/70 bg-zinc-950/40 px-2.5 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-zinc-500">Connection status</p>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px]"
            disabled={testing}
            onClick={() => void handleTest()}
          >
            {testing ? "…" : "Test"}
          </Button>
        </div>
        <p
          className={cn(
            "mt-1 font-mono text-[11px]",
            health?.isLive ? "text-emerald-400/90" : "text-amber-400/90",
          )}
        >
          {apiStatus}
        </p>
        {testResult ? (
          <p className="mt-1 text-[10px] text-zinc-500">Last test: {testResult}</p>
        ) : null}
      </div>

      <p className="text-[10px] leading-snug text-zinc-600">
        Session settings apply to paper-trading simulation only — not live broker execution.
      </p>

      <div className="mt-auto border-t border-zinc-800/70 pt-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Session recap
        </p>
        <div className="grid grid-cols-2 gap-2">
          <SessionMetric
            label="Execution"
            value={settings.operatingMode === "paper" ? "Paper trading" : "Demo"}
          />
          <SessionMetric label="Model" value={POLICY_MODEL_INFO.algorithm} />
          <SessionMetric label="Upstream host" value={host || "—"} />
          <SessionMetric
            label="Health"
            value={health?.model_loaded ? "Model loaded" : "No model flag"}
          />
        </div>
      </div>
    </Panel>
  );
}
