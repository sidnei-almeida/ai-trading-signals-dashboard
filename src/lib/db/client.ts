import { neon } from "@neondatabase/serverless";

/**
 * Neon Postgres handle.
 *
 * `NEON_POSTGRES` is what the Vercel project sets; `DATABASE_URL` is accepted
 * as the conventional fallback for local runs and other hosts. The dashboard
 * degrades to reading CSV off disk when neither is set, so every caller must
 * check `hasDatabase()` first rather than assuming a connection exists.
 */
export function databaseUrl(): string | undefined {
  return process.env.NEON_POSTGRES ?? process.env.DATABASE_URL;
}

export function hasDatabase(): boolean {
  return Boolean(databaseUrl());
}

let cached: ReturnType<typeof neon> | null = null;
let cachedUrl: string | null = null;

export function getSql() {
  const url = databaseUrl();
  if (!url) {
    throw new Error(
      "NEON_POSTGRES is not set. Add it to .env.local and to the Vercel project env vars.",
    );
  }
  if (!cached || cachedUrl !== url) {
    cached = neon(url);
    cachedUrl = url;
  }
  return cached;
}
