/** Max characters per Deepgram TTS request (API allows 2000; smaller chunks = reliable playback). */
export const TTS_CHUNK_MAX = 450;

/** Strip navigation markers from assistant text. */
export function stripActionMarkers(text: string): string {
  return text
    .replace(/\[SCROLL:(projects|skills|contact|experience|terminal)\]/gi, "")
    .replace(/\[OPEN_RESUME\]/gi, "")
    .trim();
}

/** Remove meta commentary (sources, scrolling, knowledge base) from user-facing replies. */
export function sanitizeJarvisUserFacingText(text: string): string {
  let t = stripActionMarkers(text);

  const patterns: RegExp[] = [
    /\s*,?\s*(?:based on|according to)\s+(?:the\s+)?(?:knowledge\s*base|portfolio(?:\s+data)?|(?:derived\s+)?facts|(?:this\s+)?site|work\s+history\s+on\s+this\s+site)[^.]*\.?/gi,
    /\s*(?:I\s+)?(?:got|pulled|found)\s+this\s+(?:from|in)\s+(?:the\s+)?knowledge\s*base[^.]*\.?/gi,
    /\s*this\s+(?:answer|info(?:rmation)?)\s+(?:is\s+)?(?:from|comes\s+from)\s+(?:the\s+)?knowledge\s*base[^.]*\.?/gi,
    /\s*(?:using|from)\s+(?:the\s+)?(?:knowledge\s*base|portfolio\s+data|derived\s+facts)[^.]*\.?/gi,
    /\s*citing\s+(?:work\s+history|the\s+knowledge\s*base)[^.]*\.?/gi,
    /\s*calculated\s+from\s+[^.]*\.?/gi,
    /\s*Scrolling\s+to\s+[^.]*\.?/gi,
    /\s*Showing\s+the\s+full\s+stack\s+now\.?/gi,
    /\s*Opening\s+the\s+contact\s+channel\.?/gi,
    /\s*Launching\s+the\s+developer\s+console\.?/gi,
  ];

  for (const re of patterns) {
    t = t.replace(re, "");
  }

  return t
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\.{2,}/g, ".")
    .trim();
}

/** Text safe to send to TTS (no action markers / markdown noise). */
export function textForJarvisSpeech(displayText: string): string {
  return sanitizeJarvisUserFacingText(displayText)
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

/** Split into sentence-sized chunks for sequential TTS playback. */
export function splitTextForTts(text: string, maxLen = TTS_CHUNK_MAX): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxLen) return [trimmed];

  const sentences = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [trimmed];
  const chunks: string[] = [];
  let current = "";

  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;

    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxLen) {
      current = candidate;
      continue;
    }

    if (current) chunks.push(current);
    if (sentence.length <= maxLen) {
      current = sentence;
    } else {
      for (let i = 0; i < sentence.length; i += maxLen) {
        chunks.push(sentence.slice(i, i + maxLen));
      }
      current = "";
    }
  }

  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [trimmed.slice(0, maxLen)];
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
