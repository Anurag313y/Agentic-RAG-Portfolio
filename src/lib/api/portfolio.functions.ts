import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { JARVIS_KNOWLEDGE_BASE_MAX, type AdminContent } from "../content.types";
import {
  fetchAdminContent,
  fetchPublicContent,
  isAdminSessionValid,
  requireAdminSession,
  resetToDefaults,
  saveAdminContent,
  triggerReindexRagBackground,
  fetchRagIndexStatus,
} from "../content.server";
const adminContentSchema = z.object({
  profile: z.record(z.unknown()),
  skills: z.array(z.object({ category: z.string(), items: z.array(z.string()) })),
  projects: z.array(z.record(z.unknown())),
  experience: z.array(z.record(z.unknown())),
  about: z.string(),
  resumeUrl: z.string(),
  cohereApiKey: z.string().optional(),
  deepgramApiKey: z.string().optional(),
  primaryModel: z.enum(["cohere", "static"]).optional(),
  jarvisEnabled: z.boolean().optional(),
  deepgramSttModel: z.string().optional(),
  deepgramTtsModel: z.string().optional(),
  jarvisKnowledgeBase: z.string().max(JARVIS_KNOWLEDGE_BASE_MAX).optional(),
});

export const getPortfolioContent = createServerFn({ method: "GET" }).handler(async () => {
  return fetchPublicContent();
});

export const loadAdminPage = createServerFn({ method: "GET" }).handler(async () => {
  const authenticated = await isAdminSessionValid();
  if (!authenticated) {
    return { authenticated: false as const, content: null };
  }
  const content = await fetchAdminContent();
  return { authenticated: true as const, content };
});

export const getAdminContent = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminSession();
  return fetchAdminContent();
});

export const updatePortfolioContent = createServerFn({ method: "POST" })
  .inputValidator(adminContentSchema)
  .handler(async ({ data }) => {
    await requireAdminSession();
    return saveAdminContent(data as AdminContent);
  });

export const resetPortfolioContent = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdminSession();
  return resetToDefaults();
});

/** Admin-only: start RAG re-index in background; client polls getRagIndexStatus. */
export const reindexRag = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdminSession();
  const status = await triggerReindexRagBackground();
  if (status.state === "unconfigured") {
    return { started: false, chunksIndexed: 0, status };
  }
  return {
    started: status.state === "indexing",
    chunksIndexed: status.chunkCount,
    status,
  };
});

/** Admin-only: current RAG index status (for dashboard badge). */
export const getRagIndexStatus = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminSession();
  return fetchRagIndexStatus();
});

