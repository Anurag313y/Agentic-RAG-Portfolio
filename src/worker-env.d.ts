/// <reference types="@cloudflare/workers-types" />

declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      PORTFOLIO_CACHE: KVNamespace;
      ADMIN_EMAIL?: string;
      ADMIN_PASSWORD?: string;
      DEEPGRAM_API_KEY?: string;
      COHERE_API_KEY?: string;
      /** SMTP username (email) — fallback if profile email is not set */
      SMTP_USER?: string;
      /** SMTP app password — configured via .dev.vars or secure environment secrets */
      SMTP_PASS?: string;
      /** SMTP host — defaults to smtp.gmail.com */
      SMTP_HOST?: string;
      /** SMTP port — defaults to 465 (implicit TLS) */
      SMTP_PORT?: string;
      NODE_ENV?: string;
    }
  }
}

declare module "cloudflare:workers" {
  export const env: Cloudflare.Env;
}

export {};

