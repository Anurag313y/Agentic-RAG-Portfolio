import { contactMessages, adminUsers, portfolioContent, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

import {
  createSessionId,
  hashPassword,
  SESSION_COOKIE,
  sessionCookieOptions,
  sessionExpiryMs,
  verifyPassword,
} from "./auth.server";
import { invalidateContentCache, readContentCache, writeContentCache, writeAdminSecretsKv, setSecretsMemory, ensureAdminSecretsKv } from "./cache.server";
import { secretsFromContent, resolveCohereApiKey } from "./secrets.server";
import type { AdminContent, PortfolioContent } from "./content.types";
import { getDb } from "./db.server";
import {
  DEFAULT_ADMIN_CONTENT,
  mergeContent,
  toPublicContent,
} from "./portfolio-defaults";
import { waitUntil } from "cloudflare:workers";

import { getServerSecrets } from "./config.server";
import { indexContent, markRagUnconfigured } from "./rag.server";
import { readRagIndexStatus } from "./cache.server";
import type { RagIndexStatus } from "./content.types";

export type { RagIndexStatus };

const CONTENT_ROW_ID = 1;
const ADMIN_CONTENT_CACHE_TTL_MS = 2 * 60 * 1000;

let adminContentMemory: { content: AdminContent; expiresAt: number } | null = null;

function invalidateAdminContentCache(): void {
  adminContentMemory = null;
}

export async function ensureAdminUser(): Promise<void> {
  const db = getDb();
  const secrets = getServerSecrets();
  const targetEmail = secrets.adminEmail.toLowerCase();

  const existing = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, targetEmail))
    .get();

  if (existing) {
    // If the env password still matches the stored hash, nothing to do.
    const matches = await verifyPassword(secrets.adminPassword, existing.passwordHash);
    if (matches) return;

    // Password in .dev.vars changed — update the stored hash so login works.
    const newHash = await hashPassword(secrets.adminPassword);
    await db
      .update(adminUsers)
      .set({ passwordHash: newHash })
      .where(eq(adminUsers.id, existing.id));
    return;
  }

  // No admin user with this email yet — create one.
  const passwordHash = await hashPassword(secrets.adminPassword);
  await db.insert(adminUsers).values({
    email: targetEmail,
    passwordHash,
    createdAt: Date.now(),
  });
}

export async function ensureContentSeeded(): Promise<void> {
  const db = getDb();
  const row = await db
    .select()
    .from(portfolioContent)
    .where(eq(portfolioContent.id, CONTENT_ROW_ID))
    .get();
  if (row) return;

  const now = Date.now();
  await db.insert(portfolioContent).values({
    id: CONTENT_ROW_ID,
    data: JSON.stringify(DEFAULT_ADMIN_CONTENT),
    updatedAt: now,
  });
}

async function readContentFromDb(): Promise<AdminContent | null> {
  const db = getDb();
  const row = await db
    .select()
    .from(portfolioContent)
    .where(eq(portfolioContent.id, CONTENT_ROW_ID))
    .get();
  if (!row) return null;
  const content = mergeContent(JSON.parse(row.data));
  setSecretsMemory(secretsFromContent(content));
  return content;
}

async function bootstrapSecretsKv(content: AdminContent): Promise<void> {
  await ensureAdminSecretsKv(secretsFromContent(content));
}

function preserveAdminSecrets(incoming: AdminContent, existing: AdminContent | null): AdminContent {
  if (!existing) return incoming;
  return {
    ...incoming,
    deepgramApiKey: incoming.deepgramApiKey?.trim() || existing.deepgramApiKey || "",
    cohereApiKey: incoming.cohereApiKey?.trim() || existing.cohereApiKey || "",
  };
}

export async function fetchPublicContent(): Promise<PortfolioContent> {
  try {
    const cached = await readContentCache();
    if (cached) return cached;

    await ensureContentSeeded();
    const fromDb = await readContentFromDb();
    const content = toPublicContent(fromDb ?? DEFAULT_ADMIN_CONTENT);
    await writeContentCache(content);
    return content;
  } catch (error) {
    console.error("[fetchPublicContent] falling back to defaults:", error);
    return toPublicContent(DEFAULT_ADMIN_CONTENT);
  }
}

export async function fetchAdminContent(): Promise<AdminContent> {
  if (adminContentMemory && adminContentMemory.expiresAt > Date.now()) {
    return adminContentMemory.content;
  }

  await ensureContentSeeded();
  const fromDb = await readContentFromDb();
  const content = fromDb ?? DEFAULT_ADMIN_CONTENT;
  await bootstrapSecretsKv(content);
  adminContentMemory = {
    content,
    expiresAt: Date.now() + ADMIN_CONTENT_CACHE_TTL_MS,
  };
  return content;
}

export async function saveAdminContent(content: AdminContent): Promise<PortfolioContent> {
  const db = getDb();
  const now = Date.now();
  const existing = await readContentFromDb();
  const payloadContent = preserveAdminSecrets(content, existing);
  const payload = JSON.stringify(payloadContent);
  const secrets = secretsFromContent(payloadContent);
  setSecretsMemory(secrets);
  await writeAdminSecretsKv(secrets);

  const existingRow = await db
    .select()
    .from(portfolioContent)
    .where(eq(portfolioContent.id, CONTENT_ROW_ID))
    .get();

  if (existingRow) {
    await db
      .update(portfolioContent)
      .set({ data: payload, updatedAt: now })
      .where(eq(portfolioContent.id, CONTENT_ROW_ID));
  } else {
    await db.insert(portfolioContent).values({
      id: CONTENT_ROW_ID,
      data: payload,
      updatedAt: now,
    });
  }

  const publicContent = toPublicContent(payloadContent);
  invalidateAdminContentCache();
  await invalidateContentCache();
  await writeContentCache(publicContent);

  // Eager RAG indexing — keep worker alive until embed finishes.
  waitUntil(
    resolveCohereApiKey(payloadContent)
      .then(async (key) => {
        if (key) {
          await indexContent(payloadContent, key, { force: false });
          return;
        }
        await markRagUnconfigured();
      })
      .catch((err) => console.error("[rag] Background indexing failed:", err)),
  );

  return publicContent;
}

export async function resetToDefaults(): Promise<PortfolioContent> {
  return saveAdminContent(DEFAULT_ADMIN_CONTENT);
}

/**
 * Kick off RAG re-index in the background so status polls can run concurrently.
 * Returns immediately with current indexing status.
 */
export async function triggerReindexRagBackground(): Promise<RagIndexStatus> {
  const content = await fetchAdminContent();
  const cohereKey = await resolveCohereApiKey(content);
  if (!cohereKey) {
    await markRagUnconfigured();
    return fetchRagIndexStatus();
  }

  const current = await fetchRagIndexStatus();
  if (current.state === "indexing") {
    return current;
  }

  waitUntil(
    indexContent(content, cohereKey, { force: true }).catch((err) => {
      console.error("[rag] Background reindex failed:", err);
    }),
  );

  // Allow indexContent to write initial KV status before the client polls.
  await new Promise((resolve) => setTimeout(resolve, 80));
  return fetchRagIndexStatus();
}

export async function fetchRagIndexStatus(): Promise<RagIndexStatus> {
  return readRagIndexStatus();
}

export async function authenticateAdmin(email: string, password: string): Promise<boolean> {
  await ensureAdminUser();
  const db = getDb();
  const user = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email.trim().toLowerCase()))
    .get();
  if (!user) return false;
  if (!(await verifyPassword(password, user.passwordHash))) return false;

  const sessionId = createSessionId();
  const expiresAt = sessionExpiryMs();
  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    expiresAt,
    createdAt: Date.now(),
  });

  setCookie(SESSION_COOKIE, sessionId, sessionCookieOptions(new Date(expiresAt)));
  return true;
}

export async function logoutAdmin(): Promise<void> {
  const sessionId = getCookie(SESSION_COOKIE);
  if (sessionId) {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }
  deleteCookie(SESSION_COOKIE, { path: "/" });
}

export async function isAdminSessionValid(): Promise<boolean> {
  const sessionId = getCookie(SESSION_COOKIE);
  if (!sessionId) return false;

  const db = getDb();
  const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!session || session.expiresAt < Date.now()) {
    if (session) await db.delete(sessions).where(eq(sessions.id, sessionId));
    deleteCookie(SESSION_COOKIE, { path: "/" });
    return false;
  }
  return true;
}

export async function requireAdminSession(): Promise<void> {
  const ok = await isAdminSessionValid();
  if (!ok) throw new Error("Unauthorized");
}

export async function saveContactMessage(input: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}): Promise<void> {
  const db = getDb();
  await db.insert(contactMessages).values({
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    subject: input.subject,
    message: input.message,
    createdAt: Date.now(),
  });
}
