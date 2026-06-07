const DEEPGRAM_BASE = "https://api.deepgram.com";

/** Strip `;codecs=opus` etc. — Deepgram pre-recorded API expects a simple audio MIME. */
export function normalizeAudioMimeType(mimeType: string): string {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() || "audio/webm";
  if (
    base === "audio/webm" ||
    base === "audio/wav" ||
    base === "audio/mp3" ||
    base === "audio/mpeg" ||
    base === "audio/ogg" ||
    base === "audio/flac"
  ) {
    return base;
  }
  return "audio/webm";
}

function parseDeepgramErrMsg(body: string): string {
  try {
    const parsed = JSON.parse(body) as { err_msg?: string };
    return parsed.err_msg ?? "";
  } catch {
    return body.slice(0, 200);
  }
}

function mapDeepgramHttpError(status: number, body: string, context: "listen" | "speak" | "grant"): never {
  const errMsg = parseDeepgramErrMsg(body);
  console.error(`[deepgram] ${context} failed:`, status, body);

  if (status === 401 || errMsg.toLowerCase().includes("invalid credentials")) {
    throw new Error("DEEPGRAM_AUTH_INVALID");
  }
  if (status === 400 && errMsg.toLowerCase().includes("model")) {
    throw new Error("DEEPGRAM_MODEL_INVALID");
  }
  if (
    context === "listen" &&
    status === 400 &&
    /corrupt|unsupported data|invalid audio|could not decode/i.test(errMsg)
  ) {
    throw new Error("INVALID_AUDIO");
  }
  if (context === "listen") throw new Error("DEEPGRAM_LISTEN_FAILED");
  if (context === "speak") throw new Error("DEEPGRAM_SPEAK_FAILED");
  throw new Error("DEEPGRAM_GRANT_FAILED");
}

function requireDeepgramKey(apiKey: string | null | undefined): string {
  const key = apiKey?.trim();
  if (!key) {
    throw new Error("DEEPGRAM_NOT_CONFIGURED");
  }
  return key;
}

export async function grantDeepgramAccessToken(
  apiKey: string | null | undefined,
  ttlSeconds = 60,
): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const key = requireDeepgramKey(apiKey);
  const res = await fetch(`${DEEPGRAM_BASE}/v1/auth/grant`, {
    method: "POST",
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ttl_seconds: ttlSeconds }),
  });

  if (!res.ok) {
    const body = await res.text();
    mapDeepgramHttpError(res.status, body, "grant");
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function synthesizeSpeech(
  apiKey: string | null | undefined,
  text: string,
  model: string,
): Promise<{ base64: string; mimeType: string }> {
  const key = requireDeepgramKey(apiKey);
  const trimmed = text.trim().slice(0, 2000);
  if (!trimmed) {
    throw new Error("EMPTY_TEXT");
  }

  const params = new URLSearchParams({
    model,
    encoding: "mp3",
  });

  const res = await fetch(`${DEEPGRAM_BASE}/v1/speak?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: trimmed }),
  });

  if (!res.ok) {
    const body = await res.text();
    mapDeepgramHttpError(res.status, body, "speak");
  }

  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const base64 = bytesToBase64(bytes);
  return { base64, mimeType: "audio/mpeg" };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export type TranscribeOptions = {
  language?: string;
  /** Skip smart_format/punctuate for lower STT latency on short voice clips. */
  fast?: boolean;
};

const MIN_AUDIO_BYTES = 256;

/** Ordered STT language attempts — avoids unreliable `multi` on pre-recorded API. */
function listenLanguageCandidates(language?: string): string[] {
  const primary = language?.trim() || "en";
  if (primary === "multi") {
    return ["en", "hi"];
  }
  const candidates = [primary];
  if (primary !== "en") candidates.push("en");
  if (primary !== "hi") candidates.push("hi");
  return [...new Set(candidates)];
}

function decodeAudioPayload(audioBase64: string): Uint8Array {
  const bytes = base64ToBytes(audioBase64);
  if (bytes.length < MIN_AUDIO_BYTES) {
    throw new Error("EMPTY_AUDIO");
  }
  return bytes;
}

function extractTranscript(data: unknown): string {
  const parsed = data as {
    results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> };
  };
  return parsed.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
}

function isNonRetryableListenError(status: number, body: string): boolean {
  if (status === 401) return true;
  const errMsg = parseDeepgramErrMsg(body).toLowerCase();
  if (status === 400 && errMsg.includes("model")) return true;
  if (status === 400 && /corrupt|unsupported data|invalid audio|could not decode/i.test(errMsg)) {
    return true;
  }
  return false;
}

export async function transcribeAudio(
  apiKey: string | null | undefined,
  audioBase64: string,
  mimeType: string,
  model: string,
  options: TranscribeOptions = {},
): Promise<string> {
  const key = requireDeepgramKey(apiKey);
  if (!audioBase64.trim()) {
    throw new Error("EMPTY_AUDIO");
  }

  const sttModel = model.trim() || "nova-3";
  const fast = options.fast ?? false;
  const contentType = normalizeAudioMimeType(mimeType);
  const audioBytes = decodeAudioPayload(audioBase64);
  const languages = listenLanguageCandidates(options.language);

  let lastStatus = 0;
  let lastBody = "";

  for (let i = 0; i < languages.length; i++) {
    const language = languages[i]!;
    const params = new URLSearchParams({
      model: sttModel,
      smart_format: fast ? "false" : "true",
      punctuate: fast ? "false" : "true",
      language,
    });

    const res = await fetch(`${DEEPGRAM_BASE}/v1/listen?${params}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${key}`,
        "Content-Type": contentType,
      },
      body: audioBytes,
    });

    if (res.ok) {
      const data = await res.json();
      const transcript = extractTranscript(data);
      if (transcript) {
        return transcript;
      }
      if (i < languages.length - 1) {
        console.warn(`[deepgram] no speech for language=${language}, retrying…`);
        continue;
      }
      throw new Error("NO_SPEECH_DETECTED");
    }

    lastStatus = res.status;
    lastBody = await res.text();

    if (isNonRetryableListenError(lastStatus, lastBody)) {
      mapDeepgramHttpError(lastStatus, lastBody, "listen");
    }

    if (i < languages.length - 1) {
      console.warn(
        `[deepgram] listen failed for language=${language}, retrying…`,
        lastStatus,
        lastBody.slice(0, 200),
      );
      continue;
    }
  }

  mapDeepgramHttpError(lastStatus, lastBody, "listen");
}
