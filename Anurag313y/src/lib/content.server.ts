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
import { invalidateContentCache, readContentCache, writeContentCache } from "./cache.server";
import type { AdminContent, PortfolioContent } from "./content.types";
import { getDb } from "./db.server";
import {
  DEFAULT_ADMIN_CONTENT,
  mergeContent,
  toPublicContent,
} from "./portfolio-defaults";
import { getServerSecrets } from "./config.server";

const CONTENT_ROW_ID = 1;

export async function ensureAdminUser(): Promise<void> {
  const db = getDb();
  const secrets = getServerSecrets();
  const existing = await db.select().from(adminUsers).limit(1);
  if (existing.length > 0) return;

  const passwordHash = await hashPassword(secrets.adminPassword);
  await db.insert(adminUsers).values({
    email: secrets.adminEmail.toLowerCase(),
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
  return mergeContent(JSON.parse(row.data));
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
  await ensureContentSeeded();
  const fromDb = await readContentFromDb();
  return fromDb ?? DEFAULT_ADMIN_CONTENT;
}

export async function saveAdminContent(content: AdminContent): Promise<PortfolioContent> {
  const db = getDb();
  const now = Date.now();
  const payload = JSON.stringify(content);

  const existing = await db
    .select()
    .from(portfolioContent)
    .where(eq(portfolioContent.id, CONTENT_ROW_ID))
    .get();

  if (existing) {
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

  const publicContent = toPublicContent(content);
  await invalidateContentCache();
  await writeContentCache(publicContent);
  return publicContent;
}

export async function resetToDefaults(): Promise<PortfolioContent> {
  return saveAdminContent(DEFAULT_ADMIN_CONTENT);
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
  subject: string;
  message: string;
}): Promise<void> {
  const db = getDb();
  await db.insert(contactMessages).values({
    ...input,
    createdAt: Date.now(),
  });
}
