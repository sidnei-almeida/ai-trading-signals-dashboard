import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure demo CSV is present in Vercel serverless bundles (FinSight adapter + fallback).
  outputFileTracingIncludes: {
    "/api/dashboard-data": ["./data/sp500.csv"],
    "/api/predict": ["./data/sp500.csv"],
    "/api/health": ["./data/sp500.csv"],
  },
};

export default nextConfig;
