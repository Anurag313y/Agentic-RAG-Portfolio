import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  askJarvisAssistant,
  getJarvisConfig,
  synthesizeJarvisSpeech,
  transcribeJarvisSpeech,
} from "@/lib/api/jarvis.functions";
import { applyJarvisActions } from "@/lib/jarvis-actions";
import type { JarvisChatMessage, JarvisLanguage, JarvisSpeechAudio } from "@/lib/content.types";
import {
  detectJarvisLanguage,
  needsBrowserTts,
  ttsLanguage,
} from "@/lib/jarvis-language";
import {
  base64ToUint8Array,
  sanitizeJarvisUserFacingText,
  splitTextForTts,
  textForJarvisSpeech,
} from "@/lib/jarvis-speech";

export type JarvisState = "ready" | "listening" | "processing" | "responding";

const STATUS_META: Record<JarvisState, { label: string; dot: string }> = {
  ready: { label: "ready · tap mic to talk", dot: "bg-emerald" },
  listening: { label: "listening…", dot: "bg-cyan" },
  processing: { label: "processing", dot: "bg-yellow-400" },
  responding: { label: "responding", dot: "bg-cyan-glow" },
};

/** Fade Q&A out this long after TTS finishes (or after text-only reply). */
const CONVERSATION_CLEAR_DELAY_MS = 3000;

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function lastUserLanguage(history: JarvisChatMessage[]): JarvisLanguage | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]?.role === "user") {
      return detectJarvisLanguage(history[i]!.content);
    }
  }
  return undefined;
}

let cachedHindiVoice: SpeechSynthesisVoice | null | undefined;

function resolveHindiVoice(): SpeechSynthesisVoice | null {
  if (cachedHindiVoice !== undefined) return cachedHindiVoice;
  if (typeof window === "undefined" || !window.speechSynthesis) {
    cachedHindiVoice = null;
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  cachedHindiVoice =
    voices.find((v) => v.lang === "hi-IN") ??
    voices.find((v) => v.lang.startsWith("hi")) ??
    null;
  return cachedHindiVoice;
}

function playBrowserSpeech(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      reject(new Error("Browser speech unavailable"));
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voice = resolveHindiVoice();
    if (voice) utter.voice = voice;
    utter.lang = voice?.lang ?? "hi-IN";
    utter.rate = 1.08;
    utter.pitch = 1;
    utter.onend = () => resolve();
    utter.onerror = () => reject(new Error("Browser speech failed"));
    window.speechSynthesis.speak(utter);
  });
}

export function useJarvisVoice(resumeUrl: string) {
  const [state, setState] = useState<JarvisState>("ready");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);
  const [supported, setSupported] = useState(false);

  const historyRef = useRef<JarvisChatMessage[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordMimeRef = useRef("audio/webm");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const processingRef = useRef(false);
  const conversationClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelConversationClear = useCallback(() => {
    if (conversationClearTimerRef.current) {
      clearTimeout(conversationClearTimerRef.current);
      conversationClearTimerRef.current = null;
    }
  }, []);

  const scheduleConversationClear = useCallback(() => {
    cancelConversationClear();
    conversationClearTimerRef.current = setTimeout(() => {
      setTranscript("");
      setResponse("");
      conversationClearTimerRef.current = null;
    }, CONVERSATION_CLEAR_DELAY_MS);
  }, [cancelConversationClear]);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const config = await getJarvisConfig();
        if (cancelled) return;
        const micOk =
          typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
        setSupported(micOk && config.enabled && config.deepgramConfigured);
      } catch {
        if (!cancelled) setSupported(false);
      }
    };

    void loadConfig();
    const onFocus = () => {
      void loadConfig();
    };
    window.addEventListener("focus", onFocus);

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        cachedHindiVoice = undefined;
        resolveHindiVoice();
      };
    }

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const cleanupListen = useCallback(() => {
    try {
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
    } catch {
      /* ignore */
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    audioChunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      cleanupListen();
      cancelConversationClear();
      audioRef.current?.pause();
      if (audioRef.current?.src) URL.revokeObjectURL(audioRef.current.src);
    };
  }, [cancelConversationClear, cleanupListen]);

  const stopCurrentAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src.startsWith("blob:")) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = null;
    }
  }, []);

  const playOneSegment = useCallback(
    (base64: string, mimeType: string) => {
      return new Promise<void>((resolve, reject) => {
        const bytes = base64ToUint8Array(base64);
        const blob = new Blob([bytes as BlobPart], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const audio = new Audio();
        audio.preload = "auto";
        audioRef.current = audio;

        const finish = () => {
          URL.revokeObjectURL(url);
          if (audioRef.current === audio) audioRef.current = null;
        };

        let started = false;
        const startPlayback = () => {
          if (started) return;
          started = true;
          void audio.play().catch((err) => {
            finish();
            reject(err);
          });
        };

        audio.onended = () => {
          finish();
          resolve();
        };
        audio.onerror = () => {
          finish();
          reject(new Error("Audio playback failed"));
        };
        audio.oncanplaythrough = startPlayback;
        audio.src = url;
        audio.load();
      });
    },
    [],
  );

  const synthesizePartWithRetry = useCallback(async (part: string, language: JarvisLanguage) => {
    const ttsText = textForJarvisSpeech(part);
    if (!ttsText) return null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await synthesizeJarvisSpeech({ data: { text: ttsText, language } });
      } catch (e) {
        if (attempt === 1) {
          console.error(`[jarvis] Failed synthesizing part after retry: "${part}"`, e);
        }
      }
    }
    return null;
  }, []);

  const playSpeechSegments = useCallback(
    async (fullText: string, language: JarvisLanguage, prefetched: JarvisSpeechAudio[]) => {
      stopCurrentAudio();

      const speechText = textForJarvisSpeech(fullText);
      if (needsBrowserTts(speechText)) {
        await playBrowserSpeech(speechText);
        return;
      }

      if (prefetched.length > 0) {
        for (const segment of prefetched) {
          await playOneSegment(segment.base64, segment.mimeType);
        }
        return;
      }

      const parts = splitTextForTts(speechText);
      if (parts.length === 0) return;

      const lang = ttsLanguage(language);
      const synthPromises = parts.map((part) => synthesizePartWithRetry(part, lang));
      for (const promise of synthPromises) {
        const audio = await promise;
        if (audio) {
          await playOneSegment(audio.base64, audio.mimeType);
        }
      }
    },
    [playOneSegment, stopCurrentAudio, synthesizePartWithRetry],
  );

  const deliverReply = useCallback(
    async (
      userText: string,
      displayText: string,
      lang: JarvisLanguage,
      speechSegments: JarvisSpeechAudio[],
      actions?: Parameters<typeof applyJarvisActions>[0],
    ) => {
      setResponse(displayText);
      setState("responding");
      applyJarvisActions(actions, resumeUrl);

      if (!voiceOn) {
        setState("ready");
        scheduleConversationClear();
        return;
      }

      try {
        await playSpeechSegments(displayText, lang, speechSegments);
      } catch (error) {
        console.error("[jarvis] TTS failed:", error);
        toast.error(error instanceof Error ? error.message : "Voice playback failed");
      } finally {
        setState("ready");
        scheduleConversationClear();
      }
    },
    [playSpeechSegments, resumeUrl, scheduleConversationClear, voiceOn],
  );

  const runQuery = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed || processingRef.current) return;

      processingRef.current = true;
      cancelConversationClear();
      setState("processing");
      setTranscript(trimmed);
      setResponse("");

      try {
        const result = await askJarvisAssistant({
          data: {
            message: trimmed,
            history: historyRef.current,
            includeSpeech: voiceOn,
          },
        });

        const displayText = sanitizeJarvisUserFacingText(result.text);
        const lang = result.language ?? detectJarvisLanguage(trimmed);

        historyRef.current = [
          ...historyRef.current.slice(-4),
          { role: "user", content: trimmed },
          { role: "assistant", content: displayText },
        ];

        await deliverReply(trimmed, displayText, lang, result.speechSegments, result.actions);
      } catch (error) {
        console.error("[jarvis] ask failed:", error);
        toast.error(error instanceof Error ? error.message : "JARVIS could not respond");
        setState("ready");
      } finally {
        processingRef.current = false;
      }
    },
    [cancelConversationClear, deliverReply, voiceOn],
  );

  const processRecording = useCallback(async () => {
    const chunks = audioChunksRef.current;
    if (chunks.length === 0) {
      throw new Error("EMPTY_AUDIO");
    }

    const blob = new Blob(chunks, { type: recordMimeRef.current });
    if (blob.size < 512) {
      throw new Error("No audio recorded. Hold the mic a bit longer and try again.");
    }
    const audioBase64 = await blobToBase64(blob);
    const mimeType = recordMimeRef.current.split(";")[0]?.trim() || "audio/webm";
    const languageHint = lastUserLanguage(historyRef.current);

    const { transcript: text } = await transcribeJarvisSpeech({
      data: { audioBase64, mimeType, languageHint },
    });

    setTranscript(text);
    setResponse("");

    const result = await askJarvisAssistant({
      data: {
        message: text,
        history: historyRef.current,
        includeSpeech: voiceOn,
      },
    });

    const displayText = sanitizeJarvisUserFacingText(result.text);
    const lang = result.language ?? detectJarvisLanguage(text);

    historyRef.current = [
      ...historyRef.current.slice(-4),
      { role: "user", content: text },
      { role: "assistant", content: displayText },
    ];

    await deliverReply(text, displayText, lang, result.speechSegments, result.actions);
    return text;
  }, [deliverReply, voiceOn]);

  const startListening = useCallback(async () => {
    if (!supported || processingRef.current) return;

    cancelConversationClear();
    setTranscript("");
    setResponse("");
    setState("listening");
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      recordMimeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 64000,
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        toast.error("Microphone recording error");
        cleanupListen();
        setState("ready");
      };

      recorder.start(100);
    } catch (error) {
      console.error("[jarvis] listen failed:", error);
      toast.error(error instanceof Error ? error.message : "Could not start listening");
      cleanupListen();
      setState("ready");
    }
  }, [cancelConversationClear, cleanupListen, supported]);

  const stopListening = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      cleanupListen();
      setState("ready");
      return;
    }

    setState("processing");

    recorder.onstop = () => {
      void (async () => {
        try {
          await processRecording();
          cleanupListen();
        } catch (error) {
          console.error("[jarvis] voice turn failed:", error);
          toast.error(error instanceof Error ? error.message : "Could not understand audio");
          cleanupListen();
          setState("ready");
        } finally {
          processingRef.current = false;
        }
      })();
    };

    processingRef.current = true;

    try {
      recorder.stop();
    } catch {
      processingRef.current = false;
      cleanupListen();
      setState("ready");
    }
  }, [cleanupListen, processRecording]);

  const cancelVoice = useCallback(() => {
    stopCurrentAudio();
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
  }, [stopCurrentAudio]);

  const statusMeta = useMemo(() => STATUS_META[state], [state]);

  return {
    state,
    transcript,
    response,
    voiceOn,
    setVoiceOn,
    supported,
    statusMeta,
    startListening,
    stopListening,
    handleQuery: runQuery,
    cancelVoice,
  };
}
