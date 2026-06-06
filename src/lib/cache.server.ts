import { env } from "cloudflare:workers";

import type { PortfolioContent, RagIndexStatus } from "./content.types";

const CACHE_KEY = "portfolio:content:v1";
const SECRETS_KEY = "portfolio:secrets:v1";
const CACHE_TTL_SECONDS = 300;

let memoryCache: { data: PortfolioContent; expiresAt: number } | null = null;

export type StoredAdminSecrets = {
  deepgramApiKey: string;
  cohereApiKey: string;
};

const RAG_STATUS_KEY = "rag:index:status:v1";
const RAG_FINGERPRINT_KEY = "rag:content:fingerprint:v1";
const RAG_EMBED_PREFIX = "rag:embed:v1:";
const RAG_EMBED_TTL_SECONDS = 3600;

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

// ---------------------------------------------------------------------------
// RAG index status + query-embedding cache
// ---------------------------------------------------------------------------

const DEFAULT_RAG_STATUS: RagIndexStatus = {
  state: "idle",
  chunkCount: 0,
  updatedAt: 0,
};

let ragStatusMemory: RagIndexStatus | null = null;

export async function readRagIndexStatus(): Promise<RagIndexStatus> {
  if (ragStatusMemory) {
    return ragStatusMemory;
  }

  try {
    const raw = await env.PORTFOLIO_CACHE.get(RAG_STATUS_KEY);
    if (!raw) return DEFAULT_RAG_STATUS;
    const parsed = { ...DEFAULT_RAG_STATUS, ...(JSON.parse(raw) as RagIndexStatus) };
    ragStatusMemory = parsed;
    return parsed;
  } catch {
    return ragStatusMemory ?? DEFAULT_RAG_STATUS;
  }
}

export async function writeRagIndexStatus(status: RagIndexStatus): Promise<void> {
  ragStatusMemory = status;
  try {
    await env.PORTFOLIO_CACHE.put(RAG_STATUS_KEY, JSON.stringify(status));
  } catch {
    // KV unavailable — in-memory status still updates polls in this isolate
  }
}

export async function readRagContentFingerprint(): Promise<string | null> {
  try {
    return await env.PORTFOLIO_CACHE.get(RAG_FINGERPRINT_KEY);
  } catch {
    return null;
  }
}

export async function writeRagContentFingerprint(fingerprint: string): Promise<void> {
  try {
    await env.PORTFOLIO_CACHE.put(RAG_FINGERPRINT_KEY, fingerprint);
  } catch {
    // ignore
  }
}

function hashQueryKey(query: string): string {
  const normalized = query.trim().toLowerCase();
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

const queryEmbedMemory = new Map<string, number[]>();
const QUERY_EMBED_MEMORY_MAX = 64;

export async function readQueryEmbeddingCache(query: string): Promise<number[] | null> {
  const memoryKey = query.trim().toLowerCase();
  const fromMemory = queryEmbedMemory.get(memoryKey);
  if (fromMemory) return fromMemory;

  try {
    const raw = await env.PORTFOLIO_CACHE.get(`${RAG_EMBED_PREFIX}${hashQueryKey(query)}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as number[];
    queryEmbedMemory.set(memoryKey, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export async function writeQueryEmbeddingCache(query: string, embedding: number[]): Promise<void> {
  const memoryKey = query.trim().toLowerCase();
  if (queryEmbedMemory.size >= QUERY_EMBED_MEMORY_MAX) {
    const oldest = queryEmbedMemory.keys().next().value;
    if (oldest) queryEmbedMemory.delete(oldest);
  }
  queryEmbedMemory.set(memoryKey, embedding);

  try {
    await env.PORTFOLIO_CACHE.put(
      `${RAG_EMBED_PREFIX}${hashQueryKey(query)}`,
      JSON.stringify(embedding),
      { expirationTtl: RAG_EMBED_TTL_SECONDS },
    );
  } catch {
    // ignore — in-memory cache still helps within this isolate
  }
}
