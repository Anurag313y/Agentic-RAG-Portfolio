import { env } from "cloudflare:workers";

const USAGE_KEY = "api:usage:v1";

type StoredUsage = {
  month: string;
  cohereCalls: number;
  cohereInputTokens: number;
  cohereOutputTokens: number;
  deepgramSttCalls: number;
  deepgramTtsCalls: number;
};

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function readStoredUsage(): Promise<StoredUsage> {
  const month = currentMonthKey();
  try {
    const raw = await env.PORTFOLIO_CACHE.get(USAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredUsage;
      if (parsed.month === month) return parsed;
    }
  } catch {
    /* ignore */
  }
  return {
    month,
    cohereCalls: 0,
    cohereInputTokens: 0,
    cohereOutputTokens: 0,
    deepgramSttCalls: 0,
    deepgramTtsCalls: 0,
  };
}

async function writeStoredUsage(usage: StoredUsage): Promise<void> {
  try {
    await env.PORTFOLIO_CACHE.put(USAGE_KEY, JSON.stringify(usage));
  } catch {
    /* KV unavailable */
  }
}

export async function recordCohereUsage(meta?: {
  billed_units?: { input_tokens?: number; output_tokens?: number };
}): Promise<void> {
  const usage = await readStoredUsage();
  usage.cohereCalls += 1;
  usage.cohereInputTokens += Math.round(meta?.billed_units?.input_tokens ?? 0);
  usage.cohereOutputTokens += Math.round(meta?.billed_units?.output_tokens ?? 0);
  await writeStoredUsage(usage);
}

export async function recordDeepgramSttUsage(): Promise<void> {
  const usage = await readStoredUsage();
  usage.deepgramSttCalls += 1;
  await writeStoredUsage(usage);
}

export async function recordDeepgramTtsUsage(): Promise<void> {
  const usage = await readStoredUsage();
  usage.deepgramTtsCalls += 1;
  await writeStoredUsage(usage);
}
