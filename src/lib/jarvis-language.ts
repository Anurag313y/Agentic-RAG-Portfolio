/** Supported conversational languages for JARVIS. */
export type JarvisLanguage = "en" | "hi" | "hinglish";

const DEVANAGARI = /[\u0900-\u097F]/;

/** Common Hindi / Hinglish tokens (Roman script). */
const HINDI_HINT =
  /\b(kya|kaise|kaun|kab|kahan|kaha|batao|bata|bataye|bataiye|hai|hain|ho|mera|meri|aap|tum|main|mein|nahi|nahin|koi|yeh|ye|woh|wo|acha|accha|theek|thik|samjha|samjhe|bhai|yaar|bas|aur|bhi|ka|ki|ke|ko|se|par|pe|kripya|dikhao|dikhado|sunao|kitne|kitna|konsa|konse|kyun|kyu|matlab|samajh|padhai|padhaai|college|school|kaam|salary|job|naukri|saal|sal)\b/i;

const ENGLISH_HINT =
  /\b(the|is|are|was|were|what|how|who|where|when|tell|show|about|his|her|please|can|you|would|could|which|does|did|has|have|many|much|years|year|experience|having)\b/i;

/** Detect the user's language from transcript or typed message. */
export function detectJarvisLanguage(text: string): JarvisLanguage {
  const trimmed = text.trim();
  if (!trimmed) return "en";

  const hasDevanagari = DEVANAGARI.test(trimmed);
  const lower = trimmed.toLowerCase();
  const hasHindi = HINDI_HINT.test(lower);
  const hasEnglish = ENGLISH_HINT.test(lower);

  if (hasDevanagari && hasEnglish) return "hinglish";
  if (hasDevanagari) return "hi";
  if (hasHindi && hasEnglish) return "hinglish";
  if (hasHindi) return "hinglish";
  return "en";
}

/** Whether reply text should use Hinglish Roman (hi or hinglish input). */
export function useHinglishReply(lang: JarvisLanguage): boolean {
  return lang === "hi" || lang === "hinglish";
}

/** Deepgram STT language — use `en` / `hi` only; `multi` can 400 on pre-recorded nova-3. */
export function sttLanguageCode(hint?: JarvisLanguage): string {
  if (hint === "en") return "en";
  if (hint === "hi" || hint === "hinglish") return "hi";
  return "en";
}

/** TTS language param — Deepgram Aura uses English voice for Hinglish Roman. */
export function ttsLanguage(lang: JarvisLanguage): JarvisLanguage {
  return lang === "en" ? "en" : "hinglish";
}

/** Browser TTS only when the model returns Devanagari despite voice instructions. */
export function needsBrowserTts(text: string): boolean {
  return DEVANAGARI.test(text);
}

/** Human-readable label for admin / debug. */
export function jarvisLanguageLabel(lang: JarvisLanguage): string {
  switch (lang) {
    case "hi":
      return "Hindi";
    case "hinglish":
      return "Hinglish";
    default:
      return "English";
  }
}

/** LLM instruction block for matching the user's language. */
export function languageInstruction(lang: JarvisLanguage): string {
  switch (lang) {
    case "hi":
    case "hinglish":
      return `The user is speaking Hindi or Hinglish. Reply in casual spoken Hinglish using Roman script only (NOT Devanagari) — e.g. "Unke paas 1 saal ka experience hai." Match their tone. Keep it short for voice.`;
    default:
      return `The user is speaking English. Reply in clear, natural English only.`;
  }
}

/** Normalize mixed-script queries so intent regex can match Hindi keywords. */
export function normalizeQueryForIntent(question: string): string {
  let q = question.toLowerCase();
  if (DEVANAGARI.test(question)) {
    q = `${q} project projects skill skills contact resume experience education email kaun kya kaise kitne saal`;
  }
  return q;
}
