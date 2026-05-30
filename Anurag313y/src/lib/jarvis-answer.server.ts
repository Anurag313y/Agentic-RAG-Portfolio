import type { AdminContent, JarvisAction, JarvisReply } from "./content.types";
import {
  buildCareerYearsReply,
  computeCareerMetrics,
  isCareerYearsQuestion,
} from "./jarvis-facts.server";
import { detectJarvisFocus } from "./jarvis-intent";

export function staticJarvisAnswer(raw: string, content: AdminContent): JarvisReply {
  const { profile, projects, skills, experience, resumeUrl } = content;
  const q = raw.toLowerCase().trim();
  if (!q) {
    return { text: "I didn't catch that. Try asking about projects, skills, or contact." };
  }

  const focus = detectJarvisFocus(q);
  const visible = projects.filter((p) => !p.hidden);

  if (focus === "projects") {
    const pick = visible[0];
    if (!pick) {
      return {
        text: `I don't have project details listed yet. You can reach ${profile.name} at ${profile.email}.`,
      };
    }
    const wantsOne = /\b(one|a |single|any|example)\b/.test(q);
    if (wantsOne) {
      return {
        text: `One of ${profile.name}'s projects is ${pick.title}: ${pick.description}`,
        actions: { scrollTo: "projects" },
      };
    }
    const top = visible
      .slice(0, 3)
      .map((p) => p.title)
      .join(", ");
    return {
      text: `His top projects include ${top}. Scrolling to the projects section now.`,
      actions: { scrollTo: "projects" },
    };
  }

  if (focus === "about") {
    return {
      text: `${profile.name} is a ${profile.role}. ${profile.headline} Based in ${profile.location}.`,
    };
  }

  if (focus === "skills") {
    const flat = skills
      .flatMap((s) => s.items)
      .slice(0, 8)
      .join(", ");
    return {
      text: `Strongest skills: ${flat}, and more. Showing the full stack now.`,
      actions: { scrollTo: "skills" },
    };
  }

  if (focus === "contact") {
    return {
      text: `Easiest path: email ${profile.email}. Opening the contact channel.`,
      actions: { scrollTo: "contact" },
    };
  }

  if (focus === "resume") {
    return {
      text: "Opening the resume in a new tab.",
      actions: { openResume: true },
    };
  }

  if (focus === "experience") {
    if (isCareerYearsQuestion(q)) {
      const metrics = computeCareerMetrics(content);
      return {
        text: buildCareerYearsReply(content, metrics),
        actions: { scrollTo: "experience" },
      };
    }
    const latest = experience[0];
    const summary = latest
      ? `${latest.role} at ${latest.company} (${latest.duration})`
      : "his roles on the site";
    return {
      text: `His latest role is ${summary}. Scrolling to experience now.`,
      actions: { scrollTo: "experience" },
    };
  }

  if (focus === "terminal") {
    return {
      text: "Launching the developer console.",
      actions: { scrollTo: "terminal" },
    };
  }

  void resumeUrl;
  return {
    text: 'Try: "show projects", "what are his skills", "contact info", or "open resume".',
  };
}

function parseJarvisActions(text: string): JarvisAction | undefined {
  const actions: JarvisAction = {};
  const scrollMatch = text.match(/\[SCROLL:(projects|skills|contact|experience|terminal)\]/i);
  if (scrollMatch) {
    actions.scrollTo = scrollMatch[1]!.toLowerCase() as JarvisAction["scrollTo"];
  }
  if (/\[OPEN_RESUME\]/i.test(text)) {
    actions.openResume = true;
  }
  return Object.keys(actions).length > 0 ? actions : undefined;
}

export function stripActionMarkers(text: string): string {
  return text
    .replace(/\[SCROLL:(projects|skills|contact|experience|terminal)\]/gi, "")
    .replace(/\[OPEN_RESUME\]/gi, "")
    .trim();
}

export function enrichLlmReply(raw: string): JarvisReply {
  const actions = parseJarvisActions(raw);
  const text = stripActionMarkers(raw);
  return actions ? { text, actions } : { text };
}
