import type { AdminContent, JarvisAction, JarvisReply } from "./content.types";
import {
  buildCareerYearsReply,
  computeCareerMetrics,
  isCareerYearsQuestion,
} from "./jarvis-facts.server";
import { detectJarvisFocus } from "./jarvis-intent";
import { sanitizeJarvisUserFacingText } from "./jarvis-speech";

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
      };
    }
    const top = visible
      .slice(0, 3)
      .map((p) => p.title)
      .join(", ");
    return {
      text: `His top projects include ${top}.`,
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
      text: `Strongest skills: ${flat}, and more.`,
    };
  }

  if (focus === "contact") {
    return {
      text: `Easiest path: email ${profile.email}.`,
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
      };
    }
    const latest = experience[0];
    const summary = latest
      ? `${latest.role} at ${latest.company} (${latest.duration})`
      : "his roles on the site";
    return {
      text: `His latest role is ${summary}.`,
    };
  }

  if (focus === "terminal") {
    return {
      text: "You can use the terminal mode in the hero section for interactive commands.",
    };
  }

  void resumeUrl;
  return {
    text: 'Try: "show projects", "what are his skills", "contact info", or "open resume".',
  };
}

function parseJarvisActions(text: string): JarvisAction | undefined {
  if (!/\[OPEN_RESUME\]/i.test(text)) return undefined;
  return { openResume: true };
}

export function enrichLlmReply(raw: string): JarvisReply {
  const actions = parseJarvisActions(raw);
  const text = sanitizeJarvisUserFacingText(raw);
  return actions ? { text, actions } : { text };
}
