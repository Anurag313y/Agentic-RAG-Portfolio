import type { EXPERIENCE, PROFILE, PROJECTS, SKILLS } from "./portfolio-data";

export type PortfolioContent = {
  profile: typeof PROFILE;
  skills: typeof SKILLS;
  projects: Array<(typeof PROJECTS)[number] & { hidden?: boolean }>;
  experience: typeof EXPERIENCE;
  about: string;
  resumeUrl: string;
  primaryModel?: "cohere" | "static";
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
  cohereApiKey?: string;
  deepgramApiKey?: string;
  /** Personal facts, FAQs, hobbies, goals — injected into the LLM system prompt. */
  jarvisKnowledgeBase?: string;
};

export const PORTFOLIO_QUERY_KEY = ["portfolio", "content"] as const;

export type RagIndexState = "idle" | "indexing" | "ready" | "failed" | "unconfigured";

export type RagIndexPhase = "preparing" | "embedding" | "persisting";

export type RagIndexStatus = {
  state: RagIndexState;
  chunkCount: number;
  /** Total chunks in the current indexing run (progress denominator). */
  totalChunks?: number;
  /** Chunks embedded so far in the current run (progress numerator). */
  processedChunks?: number;
  /** Current pipeline step — shown while processedChunks is still 0. */
  phase?: RagIndexPhase;
  /** True when indexing was skipped because content fingerprint was unchanged. */
  skipped?: boolean;
  updatedAt: number;
  error?: string;
};
