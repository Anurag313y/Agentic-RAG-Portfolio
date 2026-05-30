import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  askJarvis,
  getJarvisStatus,
  issueDeepgramToken,
  jarvisTextToSpeech,
  mapJarvisError,
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
    }),
  )
  .handler(async ({ data }) => {
    try {
      return await transcribeJarvisAudio(data.audioBase64, data.mimeType ?? "audio/webm");
    } catch (error) {
      throw new Error(mapJarvisError(error));
    }
  });

export const askJarvisAssistant = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      message: z.string().min(1).max(2000),
      history: z.array(chatMessageSchema).max(12).optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      return await askJarvis(data.message, data.history ?? []);
    } catch (error) {
      throw new Error(mapJarvisError(error));
    }
  });

export const synthesizeJarvisSpeech = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      text: z.string().min(1).max(2000),
    }),
  )
  .handler(async ({ data }) => {
    try {
      return await jarvisTextToSpeech(data.text);
    } catch (error) {
      throw new Error(mapJarvisError(error));
    }
  });
