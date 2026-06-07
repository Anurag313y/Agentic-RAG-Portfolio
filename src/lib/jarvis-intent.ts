/** What the visitor is asking about — used for routing static + LLM answers. */
export type JarvisFocus =
  | "projects"
  | "skills"
  | "experience"
  | "education"
  | "contact"
  | "resume"
  | "about"
  | "terminal"
  | "general";

import { normalizeQueryForIntent } from "./jarvis-language";

/** Personal / FAQ questions that should prioritize Knowledge Base chunks in RAG. */
export function isKnowledgeBaseQuestion(question: string): boolean {
  const q = normalizeQueryForIntent(question);
  return /\b(education|school|college|university|degree|secondary|higher secondary|higher-secondary|12th|10th|intermediate|graduate|postgraduate|mba|b\.?tech|m\.?tech|studied|study|certification|certified|hobby|hobbies|language|fluent|born|childhood|hometown|native|open to work|availability|relocate|salary|expected|interview|fun fact|matriculation|ssc|hsc|cbse|icse|where did|where has|where was|padhai|padhaai)\b/.test(
    q,
  );
}

export function detectJarvisFocus(question: string): JarvisFocus {
  const q = normalizeQueryForIntent(question);

  // Education / schooling — before experience (some users say "education history")
  if (
    /\b(education|school|college|university|secondary|higher secondary|higher-secondary|12th|10th|intermediate|matriculation|ssc|hsc|where did.*(study|school)|completed.*(school|education))\b/.test(
      q,
    )
  ) {
    return "education";
  }

  // Specific topics first (avoid "tell me" matching generic about)
  if (/\b(project|projects|portfolio|built|builds?|github repo|repos|pariyojana|projet)\b/.test(q)) {
    return "projects";
  }
  if (/\b(skill|skills|stack|tech stack|technolog|framework|kaushal)\b/.test(q)) {
    return "skills";
  }
  if (
    /\b(how many|how much|total|overall)\b.{0,40}\b(years?|yrs?)\b.{0,40}\b(experience|exp)\b/.test(
      q,
    ) ||
    /\b(years?|yrs?)\b.{0,30}\b(of\s+)?(professional\s+)?experience\b/.test(q) ||
    /\bexperience\b.{0,25}\b(years?|yrs?)\b/.test(q) ||
    /\bhow long\b.{0,30}\b(worked|working|been)\b/.test(q)
  ) {
    return "experience";
  }
  if (/\b(experience|work history|job history|company|companies|employer|worked at)\b/.test(q)) {
    return "experience";
  }
  if (/\b(contact|email|reach|hire|hiring|message him|get in touch|sampark|sampark karo|email bhejo|mail)\b/.test(q)) {
    return "contact";
  }
  if (/\b(resume|cv|curriculum|biodata)\b/.test(q)) {
    return "resume";
  }
  if (/\b(terminal|cli|shell|console|command line)\b/.test(q)) {
    return "terminal";
  }
  if (
    /\b(who is|who's|about him|about her|about anurag|introduce|introduction|background|kaun hai|kon hai|kya karta|kya karti|intro|parichay)\b/.test(
      q,
    ) ||
    /\bwhat does (he|she|they) do\b/.test(q)
  ) {
    return "about";
  }

  return "general";
}

export function focusRoutingInstruction(
  focus: JarvisFocus,
  ownerName: string,
): string {
  switch (focus) {
    case "projects":
      return `The user is asking about PROJECTS. You MUST name at least one project title from the Projects list and give a one-sentence description. Do NOT answer with only ${ownerName}'s job title, headline, or location.`;
    case "skills":
      return `The user is asking about SKILLS. List concrete technologies from the Skills section.`;
    case "experience":
      return `The user is asking about WORK EXPERIENCE or TOTAL YEARS OF EXPERIENCE. Use DERIVED FACTS for any year-count question — state the exact total years given there, never guess. For role questions, mention role, company, and duration from Experience.`;
    case "education":
      return `The user is asking about EDUCATION or schooling. Answer ONLY from knowledge_base entries in RETRIEVED CONTEXT — state school/college names, levels (10th, 12th, degree), and locations exactly as written. Do NOT say you lack information if a knowledge_base entry answers this.`;
    case "contact":
      return `The user wants CONTACT info. Give the email from the data below.`;
    case "resume":
      return `The user wants the RESUME. Confirm briefly and end with [OPEN_RESUME].`;
    case "about":
      return `The user wants a general INTRO about ${ownerName}. Use name, role, headline, and location — not a project list unless they also asked for projects.`;
    case "terminal":
      return `The user asked about the terminal/console. Explain they can switch to terminal mode in the hero section.`;
    default:
      return `Answer the user's question using RETRIEVED CONTEXT below. For personal facts (education, certifications, hobbies, background, FAQs), use knowledge_base entries first. Do NOT say you lack information when the fact appears in RETRIEVED CONTEXT.`;
  }
}
