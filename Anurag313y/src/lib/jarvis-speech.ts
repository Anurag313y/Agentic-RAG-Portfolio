/** Max characters per Deepgram TTS request (API allows 2000; smaller chunks = reliable playback). */
export const TTS_CHUNK_MAX = 450;

/** Text safe to send to TTS (no action markers / markdown noise). */
export function textForJarvisSpeech(displayText: string): string {
  return displayText
    .replace(/\[SCROLL:(projects|skills|contact|experience|terminal)\]/gi, "")
    .replace(/\[OPEN_RESUME\]/gi, "")
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
