import type { AdminContent, JarvisChatMessage, JarvisReply } from "./content.types";
import { getCohereApiKey, getGeminiApiKey } from "./config.server";
import {
  buildCareerYearsReply,
  buildDerivedFactsSection,
  computeCareerMetrics,
  isCareerYearsQuestion,
  yearsAnswerIsGrounded,
} from "./jarvis-facts.server";
import { enrichLlmReply, staticJarvisAnswer } from "./jarvis-answer.server";
import {
  detectJarvisFocus,
  focusRoutingInstruction,
  type JarvisFocus,
} from "./jarvis-intent";

function resolveLlmKeys(content: AdminContent): {
  geminiApiKey: string | null;
  cohereApiKey: string | null;
} {
  return {
    geminiApiKey: content.geminiApiKey?.trim() || getGeminiApiKey(),
    cohereApiKey: content.cohereApiKey?.trim() || getCohereApiKey(),
  };
}

/** Prefer Cohere/Gemini when API keys exist; avoids silent static mode in production. */
function resolveEffectiveModel(content: AdminContent): AdminContent["primaryModel"] {
  const configured = content.primaryModel ?? "static";
  if (configured !== "static") return configured;
  const { cohereApiKey, geminiApiKey } = resolveLlmKeys(content);
  if (cohereApiKey) return "cohere";
  if (geminiApiKey) return "gemini";
  return "static";
}

function buildKnowledgeBaseSection(content: AdminContent): string {
  const kb = content.jarvisKnowledgeBase?.trim();
  if (!kb) return "";
  return `KNOWLEDGE BASE (authoritative — use this first for personal / career / FAQ questions):
${kb}

`;
}

function buildPortfolioContext(content: AdminContent): string {
  const { profile, projects, skills, experience, about } = content;
  const visibleProjects = projects.filter((p) => !p.hidden);
  const projectLines = visibleProjects
    .map((p) => `- ${p.title}: ${p.description} (stack: ${p.stack.join(", ")})`)
    .join("\n");
  const skillLines = skills.map((s) => `- ${s.category}: ${s.items.join(", ")}`).join("\n");
  const expLines = experience
    .map((e) => {
      const bullets = e.points?.length ? ` — ${e.points[0]}` : "";
      return `- ${e.role} @ ${e.company} (${e.duration})${bullets}`;
    })
    .join("\n");

  return `PORTFOLIO DATA (only use this information):
Name: ${profile.name}
Role: ${profile.role}
Headline: ${profile.headline}
Location: ${profile.location}
Email: ${profile.email}
Intro: ${profile.intro}
About: ${about}
GitHub: ${profile.socials.github}
LinkedIn: ${profile.socials.linkedin}

Projects:
${projectLines || "(none)"}

Skills:
${skillLines || "(none)"}

Experience:
${expLines || "(none)"}`;
}

function buildFewShotExamples(ownerName: string): string {
  return `EXAMPLES (follow this style):
User: "Tell me one of ${ownerName}'s projects"
Assistant: "One of ${ownerName}'s projects is Sentinel — an observability platform for real-time logs and metrics. [SCROLL:projects]"

User: "Who is ${ownerName}?"
Assistant: "${ownerName} is a software engineer based in India, focused on fast and reliable full-stack work."

User: "What are his skills?"
Assistant: "He works with React, TypeScript, Node.js, and Linux tooling among others. [SCROLL:skills]"`;
}

function buildSystemPrompt(
  content: AdminContent,
  focus: JarvisFocus,
  metrics: ReturnType<typeof computeCareerMetrics>,
  userMessage: string,
): string {
  const hasKb = Boolean(content.jarvisKnowledgeBase?.trim());
  const sourceRule = hasKb
    ? "Only answer using DERIVED FACTS, KNOWLEDGE BASE, and PORTFOLIO DATA below. Do not invent facts. If the answer is not there, say you do not have that information and suggest email contact."
    : "Only answer using DERIVED FACTS and portfolio data below. If unsure, suggest viewing projects or contacting via email.";

  const routing = focusRoutingInstruction(focus, content.profile.name);
  const careerYearsBlock = isCareerYearsQuestion(userMessage)
    ? `\nMANDATORY FACT FOR THIS QUESTION: ${content.profile.name} has ${metrics.totalYears} years of professional experience. State this exact number.\n`
    : "";

  return `You are JARVIS, the voice assistant on ${content.profile.name}'s portfolio website.
Speak as a helpful AI assistant referring to the portfolio owner in third person (e.g. "${content.profile.name}'s project...").
Keep answers SHORT for voice: 1-3 sentences unless the user asks for detail.
${sourceRule}

CURRENT QUESTION ROUTING (mandatory):
${routing}
${careerYearsBlock}
Do NOT confuse a project question with a bio/intro: if they ask about projects, name a project title — never reply with only headline or location.

For navigation, append invisible markers at the END of your reply when appropriate (user won't hear them read aloud if stripped):
- [SCROLL:projects] [SCROLL:skills] [SCROLL:contact] [SCROLL:experience] [SCROLL:terminal]
- [OPEN_RESUME] to open the resume PDF

${buildFewShotExamples(content.profile.name)}

${buildDerivedFactsSection(content, metrics)}${buildKnowledgeBaseSection(content)}${buildPortfolioContext(content)}`;
}

function replyMatchesFocus(focus: JarvisFocus, text: string, content: AdminContent): boolean {
  const lower = text.toLowerCase();
  if (focus === "projects") {
    const visible = content.projects.filter((p) => !p.hidden);
    if (visible.length === 0) return true;
    return visible.some((p) => {
      const title = p.title.toLowerCase();
      const short = title.split(/[\s—-]/)[0] ?? title;
      return lower.includes(title) || (short.length > 3 && lower.includes(short));
    });
  }
  if (focus === "skills") {
    return content.skills.some((s) =>
      s.items.some((item) => lower.includes(item.toLowerCase())),
    );
  }
  return true;
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  message: string,
  history: JarvisChatMessage[],
): Promise<string> {
  const contents = [
    ...history.map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 320,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[gemini] error:", res.status, body);
    throw new Error("GEMINI_FAILED");
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("GEMINI_EMPTY");
  return text;
}

async function callCohere(
  apiKey: string,
  systemPrompt: string,
  message: string,
  history: JarvisChatMessage[],
  temperature = 0.15,
): Promise<string> {
  const chatHistory = history.map((h) => ({
    role: h.role === "assistant" ? "assistant" : "user",
    content: h.content,
  }));

  const res = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "command-r-plus-08-2024",
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory,
        { role: "user", content: message },
      ],
      max_tokens: 320,
      temperature,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[cohere] error:", res.status, body);
    throw new Error("COHERE_FAILED");
  }

  const data = (await res.json()) as {
    message?: { content?: Array<{ text?: string }> };
  };
  const text = data.message?.content?.[0]?.text?.trim();
  if (!text) throw new Error("COHERE_EMPTY");
  return text;
}

function groundedCareerYearsReply(content: AdminContent): JarvisReply {
  const metrics = computeCareerMetrics(content);
  return {
    text: buildCareerYearsReply(content, metrics),
    actions: { scrollTo: "experience" },
  };
}

function finalizeLlmReply(
  raw: string,
  trimmed: string,
  focus: JarvisFocus,
  content: AdminContent,
  metrics: ReturnType<typeof computeCareerMetrics>,
): JarvisReply {
  const reply = enrichLlmReply(raw);
  if (isCareerYearsQuestion(trimmed) && !yearsAnswerIsGrounded(reply.text, metrics)) {
    return groundedCareerYearsReply(content);
  }
  if (!replyMatchesFocus(focus, reply.text, content)) {
    return staticJarvisAnswer(trimmed, content);
  }
  return reply;
}

export async function generateJarvisReply(
  message: string,
  history: JarvisChatMessage[],
  content: AdminContent,
): Promise<JarvisReply> {
  const model = resolveEffectiveModel(content);
  const trimmed = message.trim();
  if (!trimmed) {
    return staticJarvisAnswer("", content);
  }

  const metrics = computeCareerMetrics(content);
  const { geminiApiKey, cohereApiKey } = resolveLlmKeys(content);
  const focus = detectJarvisFocus(trimmed);
  const systemPrompt = buildSystemPrompt(content, focus, metrics, trimmed);
  const cohereTemperature = isCareerYearsQuestion(trimmed) ? 0.05 : 0.15;

  if (model === "gemini" && geminiApiKey) {
    try {
      const raw = await callGemini(geminiApiKey, systemPrompt, trimmed, history);
      return finalizeLlmReply(raw, trimmed, focus, content, metrics);
    } catch {
      if (isCareerYearsQuestion(trimmed)) return groundedCareerYearsReply(content);
      return staticJarvisAnswer(trimmed, content);
    }
  }

  if (model === "cohere" && cohereApiKey) {
    try {
      const raw = await callCohere(
        cohereApiKey,
        systemPrompt,
        trimmed,
        history,
        cohereTemperature,
      );
      return finalizeLlmReply(raw, trimmed, focus, content, metrics);
    } catch {
      if (isCareerYearsQuestion(trimmed)) return groundedCareerYearsReply(content);
      return staticJarvisAnswer(trimmed, content);
    }
  }

  if (isCareerYearsQuestion(trimmed)) {
    return groundedCareerYearsReply(content);
  }
  return staticJarvisAnswer(trimmed, content);
}
