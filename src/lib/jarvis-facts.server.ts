import type { AdminContent } from "./content.types";

export type CareerRoleSpan = {
  company: string;
  role: string;
  duration: string;
  startYear: number;
  endYear: number;
};

export type CareerMetrics = {
  /** Authoritative total years (KB override or computed from roles). */
  totalYears: number;
  firstYear: number;
  lastYear: number;
  roles: CareerRoleSpan[];
  source: "knowledge_base" | "experience_timeline";
  kbExplicitYears: number | null;
};

const YEAR_RANGE_RE =
  /(\d{4})\s*(?:—|–|-|to)\s*(present|current|now|(\d{4}))/i;

const KB_TOTAL_YEARS_PATTERNS = [
  /(\d+(?:\.\d+)?)\s*\+?\s*years?\s+(?:of\s+)?(?:professional\s+)?experience/i,
  /(?:total|overall)\s+(?:professional\s+)?experience[:\s]+(\d+(?:\.\d+)?)\s*years?/i,
  /(?:professional\s+)?experience[:\s]+(\d+(?:\.\d+)?)\s*years?/i,
];

function currentYear(now = new Date()): number {
  return now.getFullYear();
}

export function parseExperienceDuration(
  duration: string,
  now = new Date(),
): { startYear: number; endYear: number } | null {
  const m = duration.trim().match(YEAR_RANGE_RE);
  if (!m) return null;
  const startYear = Number.parseInt(m[1]!, 10);
  const endToken = (m[2] ?? "").toLowerCase();
  const endYear =
    endToken === "present" || endToken === "current" || endToken === "now"
      ? currentYear(now)
      : Number.parseInt(m[3] ?? m[2]!, 10);
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || endYear < startYear) {
    return null;
  }
  return { startYear, endYear };
}

export function extractExplicitYearsFromKnowledgeBase(kb: string): number | null {
  const text = kb.trim();
  if (!text) return null;
  for (const re of KB_TOTAL_YEARS_PATTERNS) {
    const m = text.match(re);
    if (m?.[1]) {
      const n = Number.parseFloat(m[1]);
      if (Number.isFinite(n) && n > 0 && n < 80) return Math.round(n * 10) / 10;
    }
  }
  return null;
}

export function computeCareerMetrics(
  content: AdminContent,
  now = new Date(),
): CareerMetrics {
  const kb = content.jarvisKnowledgeBase?.trim() ?? "";
  const kbExplicitYears = extractExplicitYearsFromKnowledgeBase(kb);

  const roles: CareerRoleSpan[] = [];
  for (const entry of content.experience) {
    const span = parseExperienceDuration(entry.duration, now);
    if (!span) continue;
    roles.push({
      company: entry.company,
      role: entry.role,
      duration: entry.duration,
      startYear: span.startYear,
      endYear: span.endYear,
    });
  }

  roles.sort((a, b) => a.startYear - b.startYear);

  if (roles.length === 0) {
    const fallback = kbExplicitYears ?? 0;
    return {
      totalYears: fallback,
      firstYear: 0,
      lastYear: 0,
      roles: [],
      source: kbExplicitYears != null ? "knowledge_base" : "experience_timeline",
      kbExplicitYears,
    };
  }

  const firstYear = Math.min(...roles.map((r) => r.startYear));
  const lastYear = Math.max(...roles.map((r) => r.endYear));
  const computedTotal = Math.max(1, lastYear - firstYear);

  const totalYears = kbExplicitYears ?? computedTotal;

  return {
    totalYears,
    firstYear,
    lastYear,
    roles,
    source: kbExplicitYears != null ? "knowledge_base" : "experience_timeline",
    kbExplicitYears,
  };
}

export function formatYearsForSpeech(years: number): string {
  if (years <= 0) return "an unspecified amount of";
  const rounded = Math.round(years);
  if (Math.abs(years - rounded) < 0.15) {
    return String(rounded);
  }
  return String(years);
}

export function buildDerivedFactsSection(
  content: AdminContent,
  metrics: CareerMetrics,
): string {
  const { profile } = content;
  const lines: string[] = [
    "DERIVED FACTS (authoritative — use these exact numbers for experience-duration questions; do not guess):",
  ];

  if (metrics.roles.length > 0) {
    lines.push(
      `- Career span from work history: ${metrics.firstYear} through ${metrics.lastYear} (${formatYearsForSpeech(metrics.totalYears)} years total).`,
    );
    lines.push("- Roles (chronological):");
    for (const r of metrics.roles) {
      lines.push(
        `  • ${r.role} at ${r.company} (${r.duration}) — ${r.startYear} to ${r.endYear}`,
      );
    }
  }

  if (metrics.kbExplicitYears != null) {
    lines.push(
      `- Knowledge base states total professional experience: ${formatYearsForSpeech(metrics.kbExplicitYears)} years (this overrides timeline math).`,
    );
  }

  lines.push(
    `- When asked "how many years of experience" (or similar), answer with exactly ${formatYearsForSpeech(metrics.totalYears)} years for ${profile.name}, citing work history${metrics.kbExplicitYears != null ? " and knowledge base" : ""}.`,
  );
  lines.push(
    "- Never invent a different year count. If data is missing, say you do not have that information.",
  );

  return `${lines.join("\n")}\n\n`;
}

const CAREER_YEARS_QUESTION_RE =
  /\b(how many|how much|total|overall)\b.{0,40}\b(years?|yrs?)\b.{0,40}\b(experience|exp)\b|\b(years?|yrs?)\b.{0,30}\b(of\s+)?(professional\s+)?experience\b|\bexperience\b.{0,25}\b(years?|yrs?)\b|\bhow long\b.{0,30}\b(worked|working|been)\b/i;

export function isCareerYearsQuestion(question: string): boolean {
  return CAREER_YEARS_QUESTION_RE.test(question.trim());
}

export function extractYearsMentioned(text: string): number | null {
  const m = text.match(/\b(\d+(?:\.\d+)?)\s*\+?\s*years?\b/i);
  if (!m?.[1]) return null;
  const n = Number.parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function yearsAnswerIsGrounded(
  replyText: string,
  metrics: CareerMetrics,
): boolean {
  if (metrics.totalYears <= 0) return true;
  const mentioned = extractYearsMentioned(replyText);
  if (mentioned == null) return true;
  const expected = metrics.totalYears;
  const tolerance = Math.max(0.5, expected * 0.05);
  return Math.abs(mentioned - expected) <= tolerance;
}

export function buildCareerYearsReply(
  content: AdminContent,
  metrics: CareerMetrics,
): string {
  const name = content.profile.name;
  const years = formatYearsForSpeech(metrics.totalYears);

  if (metrics.totalYears <= 0) {
    return `I don't have enough work-history detail to calculate ${name}'s total years of experience. You can check the experience section or email ${content.profile.email}.`;
  }

  if (metrics.roles.length > 0) {
    const earliest = metrics.roles[0];
    const latest = metrics.roles[metrics.roles.length - 1];
    const basis =
      metrics.source === "knowledge_base"
        ? "the knowledge base and work history on this site"
        : `roles from ${earliest?.startYear ?? metrics.firstYear} through ${latest?.endYear ?? metrics.lastYear}`;
    return `${name} has ${years} years of professional experience, calculated from ${basis}.`;
  }

  return `${name} has ${years} years of professional experience according to the knowledge base.`;
}
