import { env } from "cloudflare:workers";

export function getServerSecrets() {
  const adminEmail = env.ADMIN_EMAIL?.trim();
  const adminPassword = env.ADMIN_PASSWORD;

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

export function getResendApiKey(): string | null {
  return env.RESEND_API_KEY?.trim() || null;
}

function readEnvSecret(
  name: keyof Pick<Env, "DEEPGRAM_API_KEY" | "COHERE_API_KEY" | "GEMINI_API_KEY">,
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
