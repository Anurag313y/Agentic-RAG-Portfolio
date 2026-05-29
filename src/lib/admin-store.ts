import { PROFILE, SKILLS, PROJECTS, EXPERIENCE } from "./portfolio-data";

// Frontend-only content store. Will be replaced by backend later.
// All admin edits persist to localStorage under these keys.

const KEY = "portfolio:content:v1";

export type Content = {
  profile: typeof PROFILE;
  skills: typeof SKILLS;
  projects: Array<(typeof PROJECTS)[number] & { hidden?: boolean }>;
  experience: typeof EXPERIENCE;
  about: string;
  resumeUrl: string;
};

const DEFAULTS: Content = {
  profile: PROFILE,
  skills: SKILLS,
  projects: PROJECTS.map((p) => ({ ...p, hidden: false })),
  experience: EXPERIENCE,
  about:
    "Software engineer focused on performance, developer experience, and clean systems design.",
  resumeUrl: PROFILE.resumeUrl,
};

export function loadContent(): Content {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveContent(c: Content) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(c));
}

export function resetContent() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

const SESSION_KEY = "portfolio:admin:session";

export function setAdminSession(on: boolean) {
  if (on) sessionStorage.setItem(SESSION_KEY, "1");
  else sessionStorage.removeItem(SESSION_KEY);
}

export function isAdminAuthed(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SESSION_KEY) === "1";
}