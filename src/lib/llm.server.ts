import type { AdminContent, JarvisChatMessage, JarvisLanguage, JarvisReply } from "./content.types";
import {
  buildCareerYearsReply,
  buildDerivedFactsSection,
  computeCareerMetrics,
  isCareerYearsQuestion,
  yearsAnswerIsGrounded,
} from "./jarvis-facts.server";
import { enrichLlmReply, staticJarvisAnswer } from "./jarvis-answer.server";
import { sanitizeJarvisUserFacingText } from "./jarvis-speech";
import { searchKnowledgeBaseAnswer } from "./jarvis-kb.server";
import {
  detectJarvisFocus,
  focusRoutingInstruction,
  isKnowledgeBaseQuestion,
  type JarvisFocus,
} from "./jarvis-intent";
import { detectJarvisLanguage, languageInstruction } from "./jarvis-language";
import { recordCohereUsage } from "./api-usage.server";
import { resolveCohereApiKey } from "./secrets.server";
import { retrieveContext, hasIndexedChunks } from "./rag.server";

/** Faster Cohere model — tuned for short voice replies with RAG context. */
const COHERE_CHAT_MODEL = "command-r7b-12-2024";
const COHERE_MAX_TOKENS = 96;

/** Prefer Cohere when API key exists; avoids silent static mode in production. */
async function resolveEffectiveModel(content: AdminContent): Promise<"cohere" | "static"> {
  const configured = content.primaryModel ?? "static";
  if (configured === "cohere") return "cohere";
  const cohereApiKey = await resolveCohereApiKey(content);
  if (cohereApiKey) return "cohere";
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

function buildFewShotExamples(ownerName: string, lang: JarvisLanguage, compact = false): string {
  if (lang === "hi" || lang === "hinglish") {
    return `EXAMPLES (casual Hinglish, Roman script):
User: "Uska ek project batao"
Assistant: "Sure — unka ek project Sentinel hai, real-time logs aur metrics ke liye."

User: "Skills kya hain?"
Assistant: "Woh React, TypeScript, Node.js aur Linux tooling pe strong hain."`;
  }
  if (compact) {
    return `EXAMPLES:
User: "What are his skills?" → List concrete technologies briefly.
User: "Where did he study?" → State school/college and level exactly from context.`;
  }
  return `EXAMPLES (warm, conversational — not robotic):
User: "Tell me one of ${ownerName}'s projects"
Assistant: "Sure — one of ${ownerName}'s projects is Sentinel, an observability platform for real-time logs and metrics."

User: "Who is ${ownerName}?"
Assistant: "He's a software engineer based in India, focused on fast and reliable full-stack work."

User: "What are his skills?"
Assistant: "He works with React, TypeScript, Node.js, and Linux tooling, among others."`;
}

function buildVoiceStyleRule(): string {
  return `Speak like a warm, articulate human — not a FAQ bot or corporate AI. Use natural phrasing; light openers like "Sure," "So," or "Right" are fine when they fit. Vary rhythm; avoid bullet lists, numbered steps, and stiff phrasing.
Never mention where information came from (no "knowledge base", "portfolio data", "derived facts", "according to", "on this site", or similar). Never say you are scrolling, showing, opening sections, or navigating — give direct answers only.
Reply ONCE in 1-2 sentences: do NOT repeat the user's question, do NOT echo "Answer:" labels from context, and do NOT restate the same fact twice.`;
}

function buildSystemPrompt(
  content: AdminContent,
  focus: JarvisFocus,
  metrics: ReturnType<typeof computeCareerMetrics>,
  userMessage: string,
  lang: JarvisLanguage,
): string {
  const hasKb = Boolean(content.jarvisKnowledgeBase?.trim());
  const sourceRule = hasKb
    ? "Use only the facts in DERIVED FACTS, KNOWLEDGE BASE, and PORTFOLIO DATA below. Do not invent facts. If the answer is not there, say you do not have that information and suggest email contact."
    : "Use only the facts in DERIVED FACTS and PORTFOLIO DATA below. If unsure, suggest contacting via email.";

  const voiceStyleRule = buildVoiceStyleRule();
  const langRule = languageInstruction(lang);
  const routing = focusRoutingInstruction(focus, content.profile.name);
  const careerYearsBlock = isCareerYearsQuestion(userMessage)
    ? `\nMANDATORY FACT FOR THIS QUESTION: ${content.profile.name} has ${metrics.totalYears} years of professional experience. State this exact number.\n`
    : "";

  return `You are JARVIS, a friendly voice assistant on ${content.profile.name}'s portfolio website — helpful and conversational, like a knowledgeable colleague.
Refer to the portfolio owner in third person (e.g. "${content.profile.name}'s project..." or "He works with...").
Keep answers SHORT for voice: 1-2 sentences unless the user asks for detail.
${langRule}
${sourceRule}
${voiceStyleRule}

CURRENT QUESTION ROUTING (mandatory):
${routing}
${careerYearsBlock}
Do NOT confuse a project question with a bio/intro: if they ask about projects, name a project title — never reply with only headline or location.

When the user wants the resume PDF, you may append [OPEN_RESUME] at the very end (it is stripped before display).

${buildFewShotExamples(content.profile.name, lang)}

${buildDerivedFactsSection(content, metrics)}${buildKnowledgeBaseSection(content)}${buildPortfolioContext(content)}`;
}

function buildRagSystemPrompt(
  content: AdminContent,
  focus: JarvisFocus,
  metrics: ReturnType<typeof computeCareerMetrics>,
  userMessage: string,
  ragContext: string,
  lang: JarvisLanguage,
): string {
  const hasKb = Boolean(content.jarvisKnowledgeBase?.trim());
  const sourceRule = hasKb
    ? "Use only the facts in DERIVED FACTS and RETRIEVED CONTEXT below. Do not invent facts. If RETRIEVED CONTEXT contains the answer (especially knowledge_base entries), you MUST state it — never claim you lack information when the fact is present. Only if the fact is truly absent, say you do not have that information and suggest email contact."
    : "Use only the facts in DERIVED FACTS and RETRIEVED CONTEXT below. If RETRIEVED CONTEXT contains the answer, state it directly. If unsure, suggest contacting via email.";

  const voiceStyleRule = buildVoiceStyleRule();
  const langRule = languageInstruction(lang);
  const routing = focusRoutingInstruction(focus, content.profile.name);
  const careerYearsBlock = isCareerYearsQuestion(userMessage)
    ? `\nMANDATORY FACT FOR THIS QUESTION: ${content.profile.name} has ${metrics.totalYears} years of professional experience. State this exact number.\n`
    : "";

  return `You are JARVIS, a friendly voice assistant on ${content.profile.name}'s portfolio website — helpful and conversational, like a knowledgeable colleague.
Refer to the portfolio owner in third person (e.g. "${content.profile.name}'s project..." or "He works with...").
Keep answers SHORT for voice: 1-2 sentences unless the user asks for detail.
${langRule}
${sourceRule}
${voiceStyleRule}

CURRENT QUESTION ROUTING (mandatory):
${routing}
${careerYearsBlock}
Do NOT confuse a project question with a bio/intro: if they ask about projects, name a project title — never reply with only headline or location.

When the user wants the resume PDF, you may append [OPEN_RESUME] at the very end (it is stripped before display).

${buildFewShotExamples(content.profile.name, lang, true)}

${buildDerivedFactsSection(content, metrics)}${ragContext}`;
}

function canAnswerWithoutLlm(trimmed: string, focus: JarvisFocus): boolean {
  return (
    focus === "contact" ||
    focus === "resume" ||
    focus === "terminal" ||
    isCareerYearsQuestion(trimmed)
  );
}

function tryInstantJarvisReply(
  trimmed: string,
  focus: JarvisFocus,
  content: AdminContent,
  lang: JarvisLanguage,
): JarvisReply | null {
  if (canAnswerWithoutLlm(trimmed, focus)) {
    if (isCareerYearsQuestion(trimmed)) {
      return groundedCareerYearsReply(content, lang);
    }
    return staticJarvisAnswer(trimmed, content, lang);
  }

  // Structured portfolio topics — instant static reply (no Cohere / RAG latency)
  if (
    focus === "projects" ||
    focus === "skills" ||
    focus === "about" ||
    focus === "experience"
  ) {
    return staticJarvisAnswer(trimmed, content, lang);
  }

  if (focus === "education" || isKnowledgeBaseQuestion(trimmed)) {
    const kbAnswer = searchKnowledgeBaseAnswer(trimmed, content.jarvisKnowledgeBase);
    if (kbAnswer) {
      return { text: sanitizeJarvisUserFacingText(kbAnswer) };
    }
  }

  return null;
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

async function callCohere(
  apiKey: string,
  systemPrompt: string,
  message: string,
  history: JarvisChatMessage[],
  temperature = 0.22,
): Promise<string> {
  const chatHistory = history.map((h) => ({
    role: h.role === "assistant" ? "assistant" : "user",
    content: h.content,
  }));

  const start = Date.now();
  const res = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: COHERE_CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory,
        { role: "user", content: message },
      ],
      max_tokens: COHERE_MAX_TOKENS,
      temperature,
    }),
  });

  console.log(`[cohere] Chat API call took ${Date.now() - start}ms`);

  if (!res.ok) {
    const body = await res.text();
    console.error("[cohere] error:", res.status, body);
    throw new Error("COHERE_FAILED");
  }

  const data = (await res.json()) as {
    message?: { content?: Array<{ text?: string }> };
    meta?: { billed_units?: { input_tokens?: number; output_tokens?: number } };
  };
  void recordCohereUsage(data.meta);
  const text = data.message?.content?.[0]?.text?.trim();
  if (!text) throw new Error("COHERE_EMPTY");
  return text;
}

function groundedCareerYearsReply(content: AdminContent, lang: JarvisLanguage): JarvisReply {
  const metrics = computeCareerMetrics(content);
  return {
    text: buildCareerYearsReply(content, metrics, lang),
    language: lang,
  };
}

function finalizeLlmReply(
  raw: string,
  trimmed: string,
  focus: JarvisFocus,
  content: AdminContent,
  metrics: ReturnType<typeof computeCareerMetrics>,
  lang: JarvisLanguage,
): JarvisReply {
  const reply = enrichLlmReply(raw);
  if (isCareerYearsQuestion(trimmed) && !yearsAnswerIsGrounded(reply.text, metrics)) {
    return { ...groundedCareerYearsReply(content, lang), language: lang };
  }
  if (!replyMatchesFocus(focus, reply.text, content)) {
    return { ...staticJarvisAnswer(trimmed, content, lang), language: lang };
  }
  return { ...reply, language: lang };
}

export async function generateJarvisReply(
  message: string,
  history: JarvisChatMessage[],
  content: AdminContent,
): Promise<JarvisReply> {
  const model = await resolveEffectiveModel(content);
  const trimmed = message.trim();
  if (!trimmed) {
    return { ...staticJarvisAnswer("", content, lang), language: lang };
  }

  const lang = detectJarvisLanguage(trimmed);
  const metrics = computeCareerMetrics(content);
  const focus = detectJarvisFocus(trimmed);
  const instant = tryInstantJarvisReply(trimmed, focus, content, lang);
  if (instant) {
    console.log(`[jarvis] Instant answer (focus=${focus}, lang=${lang}, no Cohere).`);
    return { ...instant, language: lang };
  }

  const cohereTemperature = 0.22;

  if (model === "cohere") {
    const [cohereApiKey, chunksExist] = await Promise.all([
      resolveCohereApiKey(content),
      hasIndexedChunks(),
    ]);

    if (cohereApiKey) {
      try {
        let systemPrompt: string;

        if (chunksExist) {
          const ragContext = await retrieveContext(trimmed, cohereApiKey, focus, {
            hasKnowledgeBase: Boolean(content.jarvisKnowledgeBase?.trim()),
          });
          if (ragContext) {
            systemPrompt = buildRagSystemPrompt(content, focus, metrics, trimmed, ragContext, lang);
            console.log(`[rag] RAG prompt (focus=${focus}, lang=${lang}).`);
          } else {
            systemPrompt = buildSystemPrompt(content, focus, metrics, trimmed, lang);
          }
        } else {
          systemPrompt = buildSystemPrompt(content, focus, metrics, trimmed, lang);
          console.log("[rag] No indexed chunks — full-context prompt.");
        }

        const raw = await callCohere(
          cohereApiKey,
          systemPrompt,
          trimmed,
          history,
          cohereTemperature,
        );
        return finalizeLlmReply(raw, trimmed, focus, content, metrics, lang);
      } catch {
        if (isCareerYearsQuestion(trimmed)) return { ...groundedCareerYearsReply(content, lang), language: lang };
        return { ...staticJarvisAnswer(trimmed, content, lang), language: lang };
      }
    }
  }

  if (isCareerYearsQuestion(trimmed)) {
    return { ...groundedCareerYearsReply(content, lang), language: lang };
  }
  return { ...staticJarvisAnswer(trimmed, content, lang), language: lang };
}
