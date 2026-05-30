import { env } from "cloudflare:workers";

import type { PortfolioContent } from "./content.types";

const CACHE_KEY = "portfolio:content:v1";
const SECRETS_KEY = "portfolio:secrets:v1";
const CACHE_TTL_SECONDS = 300;

let memoryCache: { data: PortfolioContent; expiresAt: number } | null = null;

export type StoredAdminSecrets = {
  deepgramApiKey: string;
  cohereApiKey: string;
  geminiApiKey: string;
};

let secretsMemory: StoredAdminSecrets | null = null;

export function getSecretsMemory(): StoredAdminSecrets | null {
  return secretsMemory;
}

export function setSecretsMemory(secrets: StoredAdminSecrets): void {
  secretsMemory = secrets;
}

export async function readAdminSecretsKv(): Promise<StoredAdminSecrets | null> {
  if (secretsMemory) return secretsMemory;

  try {
    const raw = await env.PORTFOLIO_CACHE.get(SECRETS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAdminSecrets;
    secretsMemory = parsed;
    return parsed;
  } catch {
    return secretsMemory;
  }
}

export async function writeAdminSecretsKv(secrets: StoredAdminSecrets): Promise<void> {
  secretsMemory = secrets;
  try {
    await env.PORTFOLIO_CACHE.put(SECRETS_KEY, JSON.stringify(secrets));
  } catch {
    // KV unavailable — memory still helps within the same isolate
  }
}

export async function ensureAdminSecretsKv(secrets: StoredAdminSecrets): Promise<void> {
  setSecretsMemory(secrets);
  try {
    if (await env.PORTFOLIO_CACHE.get(SECRETS_KEY)) return;
  } catch {
    return;
  }
  await writeAdminSecretsKv(secrets);
}

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
