import type { EXPERIENCE, PROFILE, PROJECTS, SKILLS } from "./portfolio-data";

export type PortfolioContent = {
  profile: typeof PROFILE;
  skills: typeof SKILLS;
  projects: Array<(typeof PROJECTS)[number] & { hidden?: boolean }>;
  experience: typeof EXPERIENCE;
  about: string;
  resumeUrl: string;
  primaryModel?: "gemini" | "cohere" | "static";
  jarvisEnabled?: boolean;
  deepgramSttModel?: string;
  deepgramTtsModel?: string;
};

export type JarvisAction = {
  scrollTo?: "projects" | "skills" | "contact" | "experience" | "terminal";
  openResume?: boolean;
};

export type JarvisChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type JarvisReply = {
  text: string;
  actions?: JarvisAction;
};

/** Free-form facts for JARVIS / Cohere — admin-only, not exposed on the public site. */
export const JARVIS_KNOWLEDGE_BASE_MAX = 24_000;

export type AdminContent = PortfolioContent & {
  geminiApiKey?: string;
  cohereApiKey?: string;
  /** Personal facts, FAQs, hobbies, goals — injected into the LLM system prompt. */
  jarvisKnowledgeBase?: string;
};

export const PORTFOLIO_QUERY_KEY = ["portfolio", "content"] as const;
