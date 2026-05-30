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
  geminiApiKey: "",
  cohereApiKey: "",
  deepgramApiKey: "",
  jarvisKnowledgeBase: "",
};

export function toPublicContent(content: AdminContent): PortfolioContent {
  const {
    geminiApiKey: _g,
    cohereApiKey: _c,
    deepgramApiKey: _d,
    jarvisKnowledgeBase: _k,
    ...publicContent
  } = content;
  return publicContent;
}

export function mergeContent(raw: unknown): AdminContent {
  return { ...DEFAULT_ADMIN_CONTENT, ...(raw as Partial<AdminContent>) };
}
