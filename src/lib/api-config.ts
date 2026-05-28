/**
 * FinSight / groq-finance-inference API (from old-quant-core reference).
 * @see old-quant-core/quant-core.js — API_CONFIG
 */
export const FINSIGHT_API_BASE_URL =
  process.env.NEXT_PUBLIC_RL_TRADING_API_URL ??
  process.env.NEXT_PUBLIC_FINSIGHT_API_URL ??
  "https://groq-finance-inference.onrender.com";

export const FINSIGHT_ENDPOINTS = {
  health: "/api/health",
  agentStatus: "/api/agent/status",
  agentControl: "/api/agent/control",
  tradesOpen: "/api/trades/open",
  trades: "/api/trades",
  logs: "/api/logs",
  portfolioHistory: "/api/portfolio/history",
  exchangeStatus: "/api/exchange/status",
  exchangeConnect: "/api/exchange/connect",
  exchangeDisconnect: "/api/exchange/disconnect",
  guardrails: "/api/guardrails",
  strategy: "/api/strategy",
  testMode: "/api/test-mode",
  paper: {
    portfolio: "/api/paper/portfolio",
    signals: "/api/paper/signals",
    simulation: "/api/paper/simulation",
  },
  testModePaper: {
    dashboard: "/api/test-mode/paper-dashboard",
    seedBalance: "/api/test-mode/paper/seed-balance",
    reset: "/api/test-mode/paper/reset",
    processSignal: "/api/test-mode/paper/process-signal",
  },
  auth: {
    signup: "/api/auth/signup",
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    me: "/api/auth/me",
    update: "/api/auth/update",
    updatePassword: "/api/auth/update-password",
    uploadAvatar: "/api/auth/upload-avatar",
  },
} as const;
