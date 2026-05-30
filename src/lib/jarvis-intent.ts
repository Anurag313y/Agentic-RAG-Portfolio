/** What the visitor is asking about — used for routing static + LLM answers. */
export type JarvisFocus =
  | "projects"
  | "skills"
  | "experience"
  | "contact"
  | "resume"
  | "about"
  | "terminal"
  | "general";

export function detectJarvisFocus(question: string): JarvisFocus {
  const q = question.toLowerCase();

  // Specific topics first (avoid "tell me" matching generic about)
  if (/\b(project|projects|portfolio|built|builds?|github repo|repos)\b/.test(q)) {
    return "projects";
  }
  if (/\b(skill|skills|stack|tech stack|technolog|framework|language)\b/.test(q)) {
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
  if (/\b(contact|email|reach|hire|hiring|message him|get in touch)\b/.test(q)) {
    return "contact";
  }
  if (/\b(resume|cv|curriculum)\b/.test(q)) {
    return "resume";
  }
  if (/\b(terminal|cli|shell|console|command line)\b/.test(q)) {
    return "terminal";
  }
  if (
    /\b(who is|who's|about him|about her|about anurag|introduce|introduction|background)\b/.test(
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
    case "contact":
      return `The user wants CONTACT info. Give the email from the data below.`;
    case "resume":
      return `The user wants the RESUME. Confirm briefly and end with [OPEN_RESUME].`;
    case "about":
      return `The user wants a general INTRO about ${ownerName}. Use name, role, headline, and location — not a project list unless they also asked for projects.`;
    case "terminal":
      return `The user asked about the terminal/console. Explain they can switch to terminal mode in the hero section.`;
    default:
      return `Answer the user's question using the facts below. If they ask about projects, skills, or experience, use those sections — not a generic bio.`;
  }
}
