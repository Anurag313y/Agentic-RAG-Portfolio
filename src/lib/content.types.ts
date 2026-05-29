import type { EXPERIENCE, PROFILE, PROJECTS, SKILLS } from "./portfolio-data";

export type PortfolioContent = {
  profile: typeof PROFILE;
  skills: typeof SKILLS;
  projects: Array<(typeof PROJECTS)[number] & { hidden?: boolean }>;
  experience: typeof EXPERIENCE;
  about: string;
  resumeUrl: string;
  primaryModel?: "gemini" | "cohere" | "static";
};

export type AdminContent = PortfolioContent & {
  geminiApiKey?: string;
  cohereApiKey?: string;
};

export const PORTFOLIO_QUERY_KEY = ["portfolio", "content"] as const;
