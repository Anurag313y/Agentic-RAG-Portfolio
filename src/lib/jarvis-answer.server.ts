import type { AdminContent, JarvisAction, JarvisLanguage, JarvisReply } from "./content.types";
import {
  buildCareerYearsReply,
  computeCareerMetrics,
  isCareerYearsQuestion,
} from "./jarvis-facts.server";
import { detectJarvisFocus } from "./jarvis-intent";
import { sanitizeJarvisUserFacingText } from "./jarvis-speech";

function useHinglish(lang?: JarvisLanguage): boolean {
  return lang === "hi" || lang === "hinglish";
}

export function staticJarvisAnswer(
  raw: string,
  content: AdminContent,
  lang: JarvisLanguage = "en",
): JarvisReply {
  const { profile, projects, skills, experience, resumeUrl } = content;
  const q = raw.toLowerCase().trim();
  const hinglish = useHinglish(lang);

  if (!q) {
    return {
      text: hinglish
        ? "Samajh nahi aaya. Projects, skills ya contact ke baare mein pooch sakte ho."
        : "I didn't catch that. Try asking about projects, skills, or contact.",
    };
  }

  const focus = detectJarvisFocus(q);
  const visible = projects.filter((p) => !p.hidden);

  if (focus === "projects") {
    const pick = visible[0];
    if (!pick) {
      return {
        text: hinglish
          ? `Abhi project details nahi hain. ${profile.name} ko ${profile.email} par reach kar sakte ho.`
          : `I don't have project details listed yet. You can reach ${profile.name} at ${profile.email}.`,
      };
    }
    const wantsOne = /\b(one|a |single|any|example|ek|koi)\b/.test(q);
    if (wantsOne) {
      return {
        text: hinglish
          ? `Unka ek project ${pick.title} hai — ${pick.description}`
          : `One of ${profile.name}'s projects is ${pick.title}: ${pick.description}`,
      };
    }
    const top = visible
      .slice(0, 3)
      .map((p) => p.title)
      .join(", ");
    return {
      text: hinglish
        ? `Unke top projects mein ${top} shamil hain.`
        : `His top projects include ${top}.`,
    };
  }

  if (focus === "about") {
    return {
      text: hinglish
        ? `${profile.name} ek ${profile.role} hain — ${profile.headline}. ${profile.location} mein based hain.`
        : `${profile.name} is a ${profile.role}. ${profile.headline} Based in ${profile.location}.`,
    };
  }

  if (focus === "skills") {
    const flat = skills
      .flatMap((s) => s.items)
      .slice(0, 8)
      .join(", ");
    return {
      text: hinglish
        ? `Unki strong skills mein ${flat} shamil hain, aur bhi kaafi kuch.`
        : `Strongest skills: ${flat}, and more.`,
    };
  }

  if (focus === "contact") {
    return {
      text: hinglish
        ? `Sabse aasaan tareeka — email karo ${profile.email} par.`
        : `Easiest path: email ${profile.email}.`,
    };
  }

  if (focus === "resume") {
    return {
      text: hinglish ? "Resume nayi tab mein khol raha hoon." : "Opening the resume in a new tab.",
      actions: { openResume: true },
    };
  }

  if (focus === "experience") {
    if (isCareerYearsQuestion(q)) {
      const metrics = computeCareerMetrics(content);
      return {
        text: buildCareerYearsReply(content, metrics, lang),
      };
    }
    const latest = experience[0];
    const summary = latest
      ? `${latest.role} at ${latest.company} (${latest.duration})`
      : hinglish
        ? "site par unke roles"
        : "his roles on the site";
    return {
      text: hinglish
        ? `Unka latest role ${summary} hai.`
        : `His latest role is ${summary}.`,
    };
  }

  if (focus === "terminal") {
    return {
      text: hinglish
        ? "Hero section mein terminal mode switch karke interactive commands use kar sakte ho."
        : "You can use the terminal mode in the hero section for interactive commands.",
    };
  }

  void resumeUrl;
  return {
    text: hinglish
      ? 'Try karo: "project batao", "skills kya hain", "contact", ya "resume kholo".'
      : 'Try: "show projects", "what are his skills", "contact info", or "open resume".',
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
