import { env } from "cloudflare:workers";

import type { PortfolioContent } from "./content.types";

const CACHE_KEY = "portfolio:content:v1";
const CACHE_TTL_SECONDS = 300;

let memoryCache: { data: PortfolioContent; expiresAt: number } | null = null;

export async function readContentCache(): Promise<PortfolioContent | null> {
  if (memoryCache && memoryCache.expiresAt > Date.now()) {
    return memoryCache.data;
  }

  try {
    const raw = await env.PORTFOLIO_CACHE.get(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PortfolioContent;
    memoryCache = { data: parsed, expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000 };
    return parsed;
  } catch {
    return memoryCache?.data ?? null;
  }
}

export async function writeContentCache(content: PortfolioContent): Promise<void> {
  memoryCache = { data: content, expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000 };
  try {
    await env.PORTFOLIO_CACHE.put(CACHE_KEY, JSON.stringify(content), {
      expirationTtl: CACHE_TTL_SECONDS,
    });
  } catch {
    // KV unavailable — memory cache still helps within the same isolate
  }
}

export async function invalidateContentCache(): Promise<void> {
  memoryCache = null;
  try {
    await env.PORTFOLIO_CACHE.delete(CACHE_KEY);
  } catch {
    // ignore
  }
}
