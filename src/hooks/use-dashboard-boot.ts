"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  fetchDashboardDataBff,
  fetchMarketDataBff,
  fetchPredictBff,
} from "@/lib/api-bff";
import { buildObservationFromDashboard } from "@/lib/dashboard-math";
import { validateDashboardBaseline, validateMarketPayload } from "@/lib/boot-validation";
import { fetchPolicyHealthWithRetry, POLICY_RETRY_MAX } from "@/lib/boot-health";
import { useBootStore, BOOT_STEPS } from "@/store/boot-store";
import { useDashboardStore } from "@/store/dashboard-store";

export function useDashboardBoot() {
  const runIdRef = useRef(0);
  const {
    phase,
    bumpBootRun,
    setPhase,
    setStepStatus,
    setMarketDataStatus,
    setPolicyApiStatus,
    setPortfolioInitStatus,
    setBootError,
    setPolicyRetry,
    setWarmingMessage,
    appendLog,
  } = useBootStore();

  const runBoot = useCallback(async () => {
    const runId = bumpBootRun();
    runIdRef.current = runId;

    setBootError(null);
    setWarmingMessage(null);
    setPolicyRetry(0, POLICY_RETRY_MAX);
    setMarketDataStatus("pending");
    setPolicyApiStatus("pending");
    setPortfolioInitStatus("pending");
    useBootStore.setState({
      steps: BOOT_STEPS.map((s) => ({ ...s, status: "pending" as const })),
      bootLogs: [],
    });
    setPhase("loading_market_data");
    appendLog("Boot sequence started", "info");

    const stale = () => runIdRef.current !== runId;

    try {
      // Step 1 — market data
      setStepStatus("market_csv", "loading");
      setMarketDataStatus("loading");
      appendLog("GET /api/market-data", "info");

      const market = await fetchMarketDataBff();
      if (stale()) return;

      setStepStatus("market_csv", "ready");
      setMarketDataStatus("ready");
      appendLog(`Market rows loaded: ${market.rows.length}`, "success");

      // Step 2 — validate replay universe
      setPhase("validating_market_data");
      setStepStatus("validate_replay", "loading");
      validateMarketPayload(market);
      if (stale()) return;

      setStepStatus("validate_replay", "ready");
      appendLog("Validated 5-asset universe (AAPL, MSFT, GOOGL, AMZN, NVDA)", "success");

      // Step 3 — PPO policy (in-process; strict — must load)
      setPhase("checking_policy_api");
      setStepStatus("policy_api", "loading");
      setPolicyApiStatus("loading");
      setWarmingMessage(null);
      appendLog("Loading PPO policy weights…", "info");

      const health = await fetchPolicyHealthWithRetry({
        onAttempt: (attempt, max) => {
          if (stale()) return;
          setPolicyRetry(attempt, max);
          if (attempt > 1) {
            setWarmingMessage("Retrying PPO policy load…");
            appendLog(`Attempt ${attempt}/${max}`, "warn");
          } else {
            appendLog(`Attempt ${attempt}/${max}`, "info");
          }
        },
        onRetryWait: () => {
          if (stale()) return;
          appendLog("PPO policy did not load — retrying…", "warn");
        },
      });
      if (stale()) return;

      useDashboardStore.getState().setHealth({
        status: health.status,
        model_loaded: health.model_loaded,
        isLive: health.isLive,
      });

      setStepStatus("policy_api", "ready");
      setPolicyApiStatus("ready");
      setWarmingMessage(null);
      appendLog("PPO policy online (in-process)", "success");

      // Step 4 — dashboard + portfolio baseline
      setPhase("initializing_portfolio");
      setStepStatus("portfolio", "loading");
      setPortfolioInitStatus("loading");
      appendLog("GET /api/dashboard-data", "info");

      const dashboard = await fetchDashboardDataBff();
      if (stale()) return;

      validateDashboardBaseline(dashboard.data!);
      useDashboardStore.getState().setDashboard(dashboard);
      setStepStatus("portfolio", "ready");
      setPortfolioInitStatus("ready");
      appendLog(
        `Paper portfolio baseline · $${useDashboardStore.getState().settings.startingCash.toLocaleString()} starting cash`,
        "success",
      );

      // Step 5 — verify live inference before unlock
      setPhase("preparing_session");
      setStepStatus("session", "loading");
      appendLog("Verifying PPO inference channel…", "info");

      const observation = buildObservationFromDashboard(
        dashboard.data!,
        useDashboardStore.getState().settings.startingCash * 0.1,
      );
      const prediction = await fetchPredictBff([...observation]);
      if (stale()) return;

      if (!prediction.isLive || prediction.source !== "local_ppo") {
        throw new Error(
          "PPO inference unavailable. Dashboard requires the in-process policy to load.",
        );
      }

      useDashboardStore.getState().setLastPrediction(prediction);
      setStepStatus("session", "ready");
      appendLog("Dashboard session ready", "success");

      useDashboardStore.getState().addActivity({
        id: `boot-${Date.now()}`,
        time: new Date().toISOString(),
        source: "System Boot",
        symbol: "PORTFOLIO",
        event: "Boot complete — market replay and PPO policy online",
        signal: "—",
        confidence: null,
        riskCheck: "OK",
        action: "BOOT",
        status: "approved",
      });

      setBootError(null);
      setPhase("ready");
    } catch (error) {
      if (stale()) return;

      let message =
        error instanceof Error ? error.message : "Boot sequence failed.";

      if (
        message.includes("market data") ||
        message.includes("404") ||
        message.includes("Historical market")
      ) {
        message = [
          "Historical market data not found.",
          "Expected local file: data/market/prices.csv",
          "Run: npm run data:stooq",
        ].join(" ");
      }

      setBootError(message);
      setPhase("error");
      appendLog(message, "error");

      const failedStep =
        useBootStore.getState().steps.find((s) => s.status === "loading")?.id ??
        "session";

      setStepStatus(failedStep, "failed");

      if (useBootStore.getState().marketDataStatus === "loading") {
        setMarketDataStatus("failed");
      }
      if (useBootStore.getState().policyApiStatus === "loading") {
        setPolicyApiStatus("failed");
      }
      if (useBootStore.getState().portfolioInitStatus === "loading") {
        setPortfolioInitStatus("failed");
      }

      if (
        failedStep === "market_csv" ||
        failedStep === "validate_replay"
      ) {
        setMarketDataStatus("failed");
      }
      if (failedStep === "policy_api") {
        setPolicyApiStatus("failed");
      }
      if (failedStep === "portfolio") {
        setPortfolioInitStatus("failed");
      }

      console.error("[Boot]", message, error);
    }
  }, [
    appendLog,
    bumpBootRun,
    setBootError,
    setMarketDataStatus,
    setPhase,
    setPolicyApiStatus,
    setPolicyRetry,
    setPortfolioInitStatus,
    setStepStatus,
    setWarmingMessage,
  ]);

  useEffect(() => {
    if (phase !== "idle") return;
    void runBoot();
  }, [phase, runBoot]);

  return {
    phase,
    runBoot,
    isReady: phase === "ready",
    policyRetryMax: POLICY_RETRY_MAX,
  };
}
