import { env } from "cloudflare:workers";
import { getRequestIP } from "@tanstack/react-start/server";

const HOUR_SECONDS = 3600;

type RateBucket = "ask" | "tts" | "token";

const LIMITS: Record<RateBucket, number> = {
  ask: 30,
  tts: 60,
  token: 120,
};

function rateKey(bucket: RateBucket, ip: string): string {
  const hour = Math.floor(Date.now() / (HOUR_SECONDS * 1000));
  return `jarvis:rate:${bucket}:${ip}:${hour}`;
}

export async function checkJarvisRateLimit(bucket: RateBucket): Promise<void> {
  const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
  const key = rateKey(bucket, ip);

  try {
    const raw = await env.PORTFOLIO_CACHE.get(key);
    const count = raw ? Number.parseInt(raw, 10) : 0;
    if (count >= LIMITS[bucket]) {
      throw new Error("RATE_LIMIT");
    }
    await env.PORTFOLIO_CACHE.put(key, String(count + 1), {
      expirationTtl: HOUR_SECONDS,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMIT") throw error;
    // KV unavailable — allow request (dev without KV)
  }
}

export function rateLimitMessage(): string {
  return "JARVIS is receiving too many requests. Please try again in a few minutes.";
}
