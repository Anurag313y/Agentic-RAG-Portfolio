/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  PORTFOLIO_CACHE: KVNamespace;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  DEEPGRAM_API_KEY?: string;
  COHERE_API_KEY?: string;
  GEMINI_API_KEY?: string;
  NODE_ENV?: string;
}

declare module "cloudflare:workers" {
  export const env: Env;
}
