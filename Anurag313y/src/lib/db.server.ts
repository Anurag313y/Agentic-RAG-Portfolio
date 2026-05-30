import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";

import * as schema from "@/db/schema";

export function getDb() {
  return drizzle(env.DB, { schema });
}

export type CloudflareEnv = typeof env;
