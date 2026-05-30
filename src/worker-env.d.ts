/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  PORTFOLIO_CACHE: KVNamespace;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  DEEPGRAM_API_KEY?: string;
  COHERE_API_KEY?: string;
  GEMINI_API_KEY?: string;
  /** Resend — https://resend.com/api-keys */
  RESEND_API_KEY?: string;
  /** e.g. "Portfolio <hello@yourdomain.com>" — must match a verified Resend domain */
  RESEND_FROM?: string;
  NODE_ENV?: string;
}

declare module "cloudflare:workers" {
  export const env: Env;
}
