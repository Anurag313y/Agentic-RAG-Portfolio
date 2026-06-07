import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  askJarvis,
  getJarvisStatus,
  issueDeepgramToken,
  jarvisTextToSpeech,
  mapJarvisError,
  processJarvisVoiceTurn,
  transcribeJarvisAudio,
} from "../jarvis.server";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(2000),
});

export const getJarvisConfig = createServerFn({ method: "GET" }).handler(async () => {
  return getJarvisStatus();
});

export const getDeepgramToken = createServerFn({ method: "POST" }).handler(async () => {
  try {
    return await issueDeepgramToken();
  } catch (error) {
    throw new Error(mapJarvisError(error));
  }
});

export const transcribeJarvisSpeech = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      audioBase64: z.string().min(1).max(6_000_000),
      mimeType: z.string().max(100).optional(),
      languageHint: z.enum(["en", "hi", "hinglish"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      return await transcribeJarvisAudio(
        data.audioBase64,
        data.mimeType ?? "audio/webm",
        data.languageHint,
      );
    } catch (error) {
      throw new Error(mapJarvisError(error));
    }
  });

/** Single round-trip: transcribe + generate reply (lower latency than two calls). */
export const processJarvisVoice = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      audioBase64: z.string().min(1).max(6_000_000),
      mimeType: z.string().max(100).optional(),
      history: z.array(chatMessageSchema).max(12).optional(),
      languageHint: z.enum(["en", "hi", "hinglish"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      return await processJarvisVoiceTurn(
        data.audioBase64,
        data.mimeType ?? "audio/webm",
        data.history ?? [],
        data.languageHint,
      );
    } catch (error) {
      throw new Error(mapJarvisError(error));
    }
  });

export const askJarvisAssistant = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      message: z.string().min(1).max(2000),
      history: z.array(chatMessageSchema).max(12).optional(),
      includeSpeech: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      return await askJarvis(data.message, data.history ?? [], {
        includeSpeech: data.includeSpeech ?? false,
      });
    } catch (error) {
      throw new Error(mapJarvisError(error));
    }
  });

export const synthesizeJarvisSpeech = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      text: z.string().min(1).max(2000),
      language: z.enum(["en", "hi", "hinglish"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      return await jarvisTextToSpeech(data.text, data.language);
    } catch (error) {
      throw new Error(mapJarvisError(error));
    }
  });
