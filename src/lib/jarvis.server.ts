import { isDeepgramConfiguredForContent, resolveDeepgramApiKey } from "./secrets.server";
import { fetchAdminContent } from "./content.server";
import { grantDeepgramAccessToken, synthesizeSpeech, transcribeAudio } from "./deepgram.server";
import type {
  AdminContent,
  JarvisAskResult,
  JarvisChatMessage,
  JarvisLanguage,
  JarvisReply,
  JarvisSpeechAudio,
  JarvisVoiceTurnResult,
} from "./content.types";
import { generateJarvisReply } from "./llm.server";
import { checkJarvisRateLimit, rateLimitMessage } from "./rate-limit.server";
import {
  recordDeepgramSttUsage,
  recordDeepgramTtsUsage,
} from "./api-usage.server";
import { needsBrowserTts, sttLanguageCode } from "./jarvis-language";
import { splitTextForTts, textForJarvisSpeech } from "./jarvis-speech";

/** Voice turns only need recent context — fewer tokens = faster Cohere replies. */
const MAX_HISTORY = 2;

export async function getJarvisStatus(): Promise<{
  enabled: boolean;
  deepgramConfigured: boolean;
  sttModel: string;
  ttsModel: string;
}> {
  const content = await fetchAdminContent();
  return {
    enabled: content.jarvisEnabled !== false,
    deepgramConfigured: await isDeepgramConfiguredForContent(content),
    sttModel: content.deepgramSttModel ?? "nova-3",
    ttsModel: content.deepgramTtsModel ?? "aura-2-thalia-en",
  };
}

export async function issueDeepgramToken(): Promise<{
  accessToken: string;
  expiresIn: number;
  sttModel: string;
}> {
  await checkJarvisRateLimit("token");
  const content = await fetchAdminContent();
  if (content.jarvisEnabled === false) {
    throw new Error("JARVIS_DISABLED");
  }
  const apiKey = await resolveDeepgramApiKey(content);
  if (!apiKey) {
    throw new Error("DEEPGRAM_NOT_CONFIGURED");
  }
  const { accessToken, expiresIn } = await grantDeepgramAccessToken(apiKey, 60);
  return {
    accessToken,
    expiresIn,
    sttModel: content.deepgramSttModel ?? "nova-3",
  };
}

async function synthesizeReplySpeech(
  reply: JarvisReply,
  apiKey: string,
  ttsModel: string,
): Promise<JarvisSpeechAudio[]> {
  const ttsText = textForJarvisSpeech(reply.text);
  if (!ttsText || needsBrowserTts(ttsText)) {
    return [];
  }

  const parts = splitTextForTts(ttsText);
  if (parts.length === 0) return [];

  const segments: JarvisSpeechAudio[] = [];

  for (const part of parts) {
    const chunk = textForJarvisSpeech(part);
    if (!chunk) continue;
    try {
      await checkJarvisRateLimit("tts");
      const result = await synthesizeSpeech(apiKey, chunk, ttsModel);
      void recordDeepgramTtsUsage();
      segments.push(result);
    } catch {
      /* continue remaining chunks */
    }
  }

  return segments;
}

async function buildJarvisAskResult(
  reply: JarvisReply,
  content: AdminContent,
  includeSpeech: boolean,
): Promise<JarvisAskResult> {
  if (!includeSpeech) {
    return { ...reply, speechSegments: [] };
  }

  const apiKey = await resolveDeepgramApiKey(content);
  if (!apiKey) {
    return { ...reply, speechSegments: [] };
  }

  const ttsModel = content.deepgramTtsModel ?? "aura-2-thalia-en";
  const speechSegments = await synthesizeReplySpeech(reply, apiKey, ttsModel);
  return { ...reply, speechSegments };
}

export async function askJarvis(
  message: string,
  history: JarvisChatMessage[] = [],
  options: { includeSpeech?: boolean } = {},
): Promise<JarvisAskResult> {
  await checkJarvisRateLimit("ask");
  const content = await fetchAdminContent();
  if (content.jarvisEnabled === false) {
    throw new Error("JARVIS_DISABLED");
  }
  const capped = history.slice(-MAX_HISTORY);
  const reply = await generateJarvisReply(message, capped, content);
  return buildJarvisAskResult(reply, content, options.includeSpeech ?? false);
}

export async function transcribeJarvisAudio(
  audioBase64: string,
  mimeType: string,
  languageHint?: JarvisLanguage,
): Promise<{ transcript: string }> {
  await checkJarvisRateLimit("token");
  const content = await fetchAdminContent();
  if (content.jarvisEnabled === false) {
    throw new Error("JARVIS_DISABLED");
  }
  const apiKey = await resolveDeepgramApiKey(content);
  if (!apiKey) {
    throw new Error("DEEPGRAM_NOT_CONFIGURED");
  }
  const model = content.deepgramSttModel ?? "nova-3";
  const transcript = await transcribeAudio(apiKey, audioBase64, mimeType, model, {
    language: sttLanguageCode(languageHint),
    fast: true,
  });
  void recordDeepgramSttUsage();
  return { transcript };
}

/** Single round-trip: STT + reply (saves one HTTP hop vs transcribe → ask). */
export async function processJarvisVoiceTurn(
  audioBase64: string,
  mimeType: string,
  history: JarvisChatMessage[] = [],
  languageHint?: JarvisLanguage,
): Promise<JarvisVoiceTurnResult> {
  await checkJarvisRateLimit("token");
  await checkJarvisRateLimit("ask");

  const content = await fetchAdminContent();
  if (content.jarvisEnabled === false) {
    throw new Error("JARVIS_DISABLED");
  }

  const apiKey = await resolveDeepgramApiKey(content);
  if (!apiKey) {
    throw new Error("DEEPGRAM_NOT_CONFIGURED");
  }

  const sttModel = content.deepgramSttModel ?? "nova-3";
  const ttsModel = content.deepgramTtsModel ?? "aura-2-thalia-en";
  const transcript = await transcribeAudio(apiKey, audioBase64, mimeType, sttModel, {
    language: sttLanguageCode(languageHint),
    fast: true,
  });
  void recordDeepgramSttUsage();

  const reply = await generateJarvisReply(transcript, history.slice(-MAX_HISTORY), content);
  const speechSegments = await synthesizeReplySpeech(reply, apiKey, ttsModel);
  return { transcript, reply, speechSegments };
}

export async function jarvisTextToSpeech(
  text: string,
  _language?: JarvisLanguage,
): Promise<{
  base64: string;
  mimeType: string;
}> {
  await checkJarvisRateLimit("tts");
  const content = await fetchAdminContent();
  if (content.jarvisEnabled === false) {
    throw new Error("JARVIS_DISABLED");
  }
  const apiKey = await resolveDeepgramApiKey(content);
  if (!apiKey) {
    throw new Error("DEEPGRAM_NOT_CONFIGURED");
  }
  const model = content.deepgramTtsModel ?? "aura-2-thalia-en";
  const result = await synthesizeSpeech(apiKey, text, model);
  void recordDeepgramTtsUsage();
  return result;
}

export function mapJarvisError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "RATE_LIMIT" || error.message.includes("too many requests")) {
      return rateLimitMessage();
    }
    if (error.message === "JARVIS_DISABLED") {
      return "JARVIS voice is temporarily disabled.";
    }
    if (error.message === "DEEPGRAM_NOT_CONFIGURED") {
      return "Voice is not configured yet. Add your Deepgram API key in Admin → API Configuration.";
    }
    if (error.message === "DEEPGRAM_AUTH_INVALID") {
      return "Deepgram API key is invalid or expired. Update it in Admin → API Configuration.";
    }
    if (error.message === "DEEPGRAM_MODEL_INVALID") {
      return "Deepgram STT model name is invalid. In Admin → API Configuration set deepgram STT model to nova-3 (or nova-2).";
    }
    if (error.message === "DEEPGRAM_GRANT_FAILED") {
      return "Deepgram token error. Using server transcription instead — try again.";
    }
    if (error.message === "DEEPGRAM_SPEAK_FAILED") {
      return "Could not generate voice audio. Check your Deepgram API key and TTS model.";
    }
    if (error.message === "DEEPGRAM_LISTEN_FAILED") {
      return "Could not transcribe audio. Check your Deepgram API key and STT model.";
    }
    if (error.message === "NO_SPEECH_DETECTED") {
      return "No speech detected. Try speaking again, closer to the mic.";
    }
    if (error.message === "EMPTY_AUDIO" || error.message === "INVALID_AUDIO") {
      return "No audio recorded. Hold the mic a bit longer and try again.";
    }
  }
  return "Something went wrong. Please try again.";
}
