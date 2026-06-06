import { PROFILE, SKILLS, PROJECTS, EXPERIENCE } from "./portfolio-data";
import type { AdminContent, PortfolioContent } from "./content.types";

export const DEFAULT_PORTFOLIO_CONTENT: PortfolioContent = {
  profile: PROFILE,
  skills: SKILLS,
  projects: PROJECTS.map((p) => ({ ...p, hidden: false })),
  experience: EXPERIENCE,
  about:
    "Software engineer focused on performance, developer experience, and clean systems design.",
  resumeUrl: PROFILE.resumeUrl,
  primaryModel: "static",
  jarvisEnabled: true,
  deepgramSttModel: "nova-3",
  deepgramTtsModel: "aura-2-thalia-en",
};

export const DEFAULT_ADMIN_CONTENT: AdminContent = {
  ...DEFAULT_PORTFOLIO_CONTENT,
  cohereApiKey: "",
  deepgramApiKey: "",
  jarvisKnowledgeBase: "",
};

export function toPublicContent(content: AdminContent): PortfolioContent {
  const {
    cohereApiKey: _c,
    deepgramApiKey: _d,
    jarvisKnowledgeBase: _k,
    ...publicContent
  } = content;
  return publicContent;
}

/** Normalize legacy DB rows (e.g. deprecated gemini primaryModel / geminiApiKey). */
export function mergeContent(raw: unknown): AdminContent {
  const partial = (raw ?? {}) as Record<string, unknown>;
  const { geminiApiKey: _legacyGemini, ...rest } = partial;

  let primaryModel = rest.primaryModel as AdminContent["primaryModel"] | "gemini" | undefined;
  if (primaryModel === "gemini") {
    primaryModel = rest.cohereApiKey ? "cohere" : "static";
  }
  if (primaryModel !== "cohere" && primaryModel !== "static") {
    primaryModel = "static";
  }

  return { ...DEFAULT_ADMIN_CONTENT, ...rest, primaryModel } as AdminContent;
}
