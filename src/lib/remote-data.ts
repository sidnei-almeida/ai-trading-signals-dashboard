import { parseSp500CsvRaw } from "@/lib/sp500-csv";
import type { PriceHistoryPoint } from "@/types/rl-trading";

/** Default: deep-rl-trading-agent data_fallback (public raw CSV on GitHub). */
export const DEFAULT_SP500_CSV_URL =
  "https://raw.githubusercontent.com/sidnei-almeida/deep-rl-trading-agent/refs/heads/main/data_fallback/sp500.csv";

const FETCH_TIMEOUT_MS = 20_000;
const CACHE_TTL_MS = 60 * 60 * 1000;

let cachedPrices: PriceHistoryPoint[] | null = null;
let cacheExpiresAt = 0;

export function resolveSp500CsvUrl(): string {
  const fromEnv =
    process.env.MARKET_DATA_SP500_CSV_URL?.trim() ||
    process.env.SP500_CSV_URL?.trim();
  return normalizeGithubCsvUrl(fromEnv || DEFAULT_SP500_CSV_URL);
}

/** Accepts blob, /raw/, or raw.githubusercontent.com links. */
export function normalizeGithubCsvUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_SP500_CSV_URL;

  const blob = trimmed.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/,
  );
  if (blob) {
    const [, owner, repo, branch, filePath] = blob;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  }

  const ghRaw = trimmed.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/raw\/(.+)$/);
  if (ghRaw) {
    const [, owner, repo, rest] = ghRaw;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${rest}`;
  }

  return trimmed;
}

export async function fetchRemoteSp500Prices(): Promise<PriceHistoryPoint[]> {
  const now = Date.now();
  if (cachedPrices && now < cacheExpiresAt) {
    return cachedPrices;
  }

  const url = resolveSp500CsvUrl();
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "text/plain" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to download sp500.csv (${response.status}) from ${url}`,
    );
  }

  const raw = await response.text();
  const prices = parseSp500CsvRaw(raw);
  if (prices.length < 2) {
    throw new Error(`sp500.csv from ${url} has insufficient rows`);
  }

  cachedPrices = prices;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return prices;
}
