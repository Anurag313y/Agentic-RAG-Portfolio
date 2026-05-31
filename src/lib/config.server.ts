import { env } from "cloudflare:workers";

export function getServerSecrets() {
  const adminEmail = env.ADMIN_EMAIL?.trim();
  const adminPassword = env.ADMIN_PASSWORD?.trim();

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Missing ADMIN_EMAIL or ADMIN_PASSWORD. Copy .dev.vars.example to .dev.vars locally, or set secrets in Cloudflare for production.",
    );
  }

  return {
    adminEmail,
    adminPassword,
    nodeEnv: env.NODE_ENV ?? "development",
  };
}

/** Fallback SMTP config from env vars — SMTP_PASS must be configured via env vars/secrets for security. */
export function getSmtpEnvFallback(): {
  smtpUser: string | null;
  smtpPass: string | null;
  smtpHost: string;
  smtpPort: number;
} {
  return {
    smtpUser: env.SMTP_USER?.trim() || null,
    smtpPass: env.SMTP_PASS?.trim() || null,
    smtpHost: env.SMTP_HOST?.trim() || "smtp.gmail.com",
    smtpPort: Number(env.SMTP_PORT?.trim()) || 465,
  };
}

function readEnvSecret(
  name: keyof Pick<Cloudflare.Env, "DEEPGRAM_API_KEY" | "COHERE_API_KEY" | "GEMINI_API_KEY">,
): string | null {
  const key = env[name]?.trim();
  return key || null;
}

export function getDeepgramApiKey(): string | null {
  return readEnvSecret("DEEPGRAM_API_KEY");
}

export function getCohereApiKey(): string | null {
  return readEnvSecret("COHERE_API_KEY");
}

export function getGeminiApiKey(): string | null {
  return readEnvSecret("GEMINI_API_KEY");
}

export function isDeepgramConfigured(): boolean {
  return Boolean(getDeepgramApiKey());
}

export function getServerConfig() {
  const secrets = getServerSecrets();
  return {
    nodeEnv: secrets.nodeEnv,
    deepgramConfigured: isDeepgramConfigured(),
  };
}
