/**
 * Direct Knowledge Base lookup — instant answers without Cohere when the match is clear.
 */

import { extractKbFactText } from "./jarvis-speech";

const KB_STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "did",
  "do",
  "does",
  "where",
  "what",
  "when",
  "how",
  "who",
  "his",
  "her",
  "have",
  "has",
  "had",
  "about",
  "tell",
  "me",
  "please",
  "from",
  "for",
  "and",
  "or",
  "in",
  "at",
  "to",
  "of",
  "on",
  "complete",
  "completed",
]);

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s.-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !KB_STOP_WORDS.has(t));
}

function scoreTextAgainstQuery(text: string, tokens: string[], queryLower: string): number {
  const lower = text.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (lower.includes(token)) score += 2;
  }

  if (/\b(education|school|secondary|higher|college|university|studied)\b/.test(queryLower)) {
    if (/\b(school|college|university|secondary|higher|jnv|nit|education|ssc|hsc|cbse)\b/i.test(text)) {
      score += 5;
    }
  }

  if (/\b(certification|certified|certificate)\b/.test(queryLower)) {
    if (/\b(certif|aws|azure|google|udemy|coursera)\b/i.test(text)) score += 4;
  }

  return score;
}

function cleanKbLine(raw: string): string {
  let t = raw
    .trim()
    .replace(/^#{1,3}\s+/, "")
    .replace(/^[-*•]\s+/, "");
  t = extractKbFactText(t);
  const kv = t.match(/^[A-Za-z][^:]{0,48}:\s+([\s\S]+)$/);
  if (kv?.[1]) t = kv[1].trim();
  return t;
}

function formatEducationVoiceAnswer(fact: string, queryLower: string): string {
  const cleaned = fact.replace(/\s+/g, " ").trim();
  if (!cleaned) return fact;

  if (/\b(higher secondary|12th|hsc|intermediate)\b/i.test(queryLower)) {
    if (/^he\b/i.test(cleaned)) return cleaned;
    const schoolMatch = cleaned.match(
      /^(?:at\s+)?(.+?)(?:\s+in\s+(\d{4}))?(?:\s+with\s+([\d.]+%?))?\.?$/i,
    );
    if (schoolMatch) {
      const place = schoolMatch[1]?.trim() ?? cleaned;
      const year = schoolMatch[2] ? ` in ${schoolMatch[2]}` : "";
      const score = schoolMatch[3] ? ` with ${schoolMatch[3]}` : "";
      return `He completed higher secondary at ${place}${year}${score}.`;
    }
    return `He completed higher secondary at ${cleaned.replace(/\.$/, "")}.`;
  }

  return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
}

/**
 * Return a direct voice-friendly answer from the Knowledge Base when one entry clearly matches.
 * Returns null when ambiguous or no strong hit — caller should use RAG + Cohere.
 */
export function searchKnowledgeBaseAnswer(
  query: string,
  knowledgeBase: string | undefined,
): string | null {
  const kb = knowledgeBase?.trim();
  if (!kb) return null;

  const queryLower = query.toLowerCase();
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return null;

  const candidates: { text: string; score: number }[] = [];

  for (const section of kb.split(/\n(?=#{1,3}\s)/)) {
    const trimmed = section.trim();
    if (!trimmed) continue;
    const score = scoreTextAgainstQuery(trimmed, tokens, queryLower);
    if (score > 0) candidates.push({ text: trimmed, score });
  }

  for (const line of kb.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length < 12) continue;
    const score = scoreTextAgainstQuery(trimmed, tokens, queryLower);
    if (score >= 4) candidates.push({ text: trimmed, score: score + 2 });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0]!;
  const second = candidates[1];

  if (best.score < 6) return null;
  if (second && best.score - second.score < 2) return null;

  const fact = cleanKbLine(best.text.split("\n")[0] ?? best.text);
  const voice = formatEducationVoiceAnswer(fact, queryLower);
  if (voice.length > 220) {
    return voice.slice(0, 217).trimEnd() + "…";
  }
  return voice;
}
