"use client";

import { BrandLogoMark } from "@/components/brand/brand-logo-mark";
import { BootChecklist } from "@/components/boot/BootChecklist";
import { BootLog } from "@/components/boot/BootLog";
import { useBootStore } from "@/store/boot-store";

import type { BootStep } from "@/store/boot-store";

import "./boot-screen.css";

function progressPercent(steps: BootStep[]): number {
  const done = steps.filter((s) => s.status === "ready").length;
  return Math.round((done / steps.length) * 100);
}

export function BootScreen() {
  const {
    phase,
    steps,
    bootLogs,
    bootError,
    warmingMessage,
    policyRetryAttempt,
    policyRetryMax,
    marketDataStatus,
    policyApiStatus,
    resetBoot,
    setPhase,
  } = useBootStore();

  const pct = progressPercent(steps);
  const isError = phase === "error";
  const isMarketFailure =
    isError &&
    (marketDataStatus === "failed" ||
      bootError?.includes("Historical market data") ||
      bootError?.includes("data:stooq"));

  const handleRetry = () => {
    resetBoot();
    setPhase("idle");
  };

  return (
    <div className="boot-screen">
      <div className="boot-screen-inner">
        <header className="boot-screen-header">
          <BrandLogoMark size={40} />
          <div className="boot-screen-brand">
            <h1 className="boot-screen-title">RL Portfolio Allocation Dashboard</h1>
            <p className="boot-screen-subtitle">
              Booting PPO allocation engine and historical market replay.
            </p>
          </div>
        </header>

        <div className="boot-progress-track" aria-hidden>
          <div className="boot-progress-fill" style={{ width: `${pct}%` }} />
        </div>

        <section className="boot-panel">
          <BootChecklist steps={steps} />
        </section>

        {warmingMessage ? (
          <p className="boot-warming">{warmingMessage}</p>
        ) : null}

        {policyApiStatus === "loading" && policyRetryAttempt > 0 ? (
          <p className="boot-warming">
            Attempt {policyRetryAttempt}/{policyRetryMax}
          </p>
        ) : null}

        <BootLog entries={bootLogs} />

        {isError && bootError ? (
          <div className="boot-error-box">
            {bootError}
            {isMarketFailure ? (
              <p className="boot-error-hint">
                Expected file: data/market/prices.csv · Run: npm run data:stooq
              </p>
            ) : policyApiStatus === "failed" ? (
              <p className="boot-error-hint">
                PPO policy API must return HTTP 200 with model loaded before the dashboard
                opens.
              </p>
            ) : null}
          </div>
        ) : null}

        {isError ? (
          <div className="boot-actions">
            <button type="button" className="boot-btn boot-btn-primary" onClick={handleRetry}>
              Retry boot
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
