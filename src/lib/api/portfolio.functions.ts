import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { AdminContent } from "../content.types";
import {
  fetchAdminContent,
  fetchPublicContent,
  requireAdminSession,
  resetToDefaults,
  saveAdminContent,
} from "../content.server";

const adminContentSchema = z.object({
  profile: z.record(z.unknown()),
  skills: z.array(z.object({ category: z.string(), items: z.array(z.string()) })),
  projects: z.array(z.record(z.unknown())),
  experience: z.array(z.record(z.unknown())),
  about: z.string(),
  resumeUrl: z.string(),
  geminiApiKey: z.string().optional(),
  cohereApiKey: z.string().optional(),
  primaryModel: z.enum(["gemini", "cohere", "static"]).optional(),
});

export const getPortfolioContent = createServerFn({ method: "GET" }).handler(async () => {
  return fetchPublicContent();
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
