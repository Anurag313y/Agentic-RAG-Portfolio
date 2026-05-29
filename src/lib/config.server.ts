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

export function getServerConfig() {
  const secrets = getServerSecrets();
  return {
    nodeEnv: secrets.nodeEnv,
  };
}
