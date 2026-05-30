import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  askJarvisAssistant,
  getJarvisConfig,
  synthesizeJarvisSpeech,
  transcribeJarvisSpeech,
} from "@/lib/api/jarvis.functions";
import { applyJarvisActions } from "@/lib/jarvis-actions";
import type { JarvisChatMessage } from "@/lib/content.types";
import {
  base64ToUint8Array,
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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read audio"));
        return;
      }
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Failed to encode audio"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read audio"));
    reader.readAsDataURL(blob);
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const config = await getJarvisConfig();
        if (cancelled) return;
        const micOk =
          typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
        setSupported(micOk && config.enabled && config.deepgramConfigured);
      } catch {
        if (!cancelled) setSupported(false);
      }
    })();
    return () => {
      cancelled = true;
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
      audioRef.current?.pause();
      if (audioRef.current?.src) URL.revokeObjectURL(audioRef.current.src);
    };
  }, [cleanupListen]);

  const playOneSegment = useCallback((base64: string, mimeType: string) => {
    return new Promise<void>((resolve, reject) => {
      const bytes = base64ToUint8Array(base64);
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.preload = "auto";
      audioRef.current = audio;

      const finish = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
      };

      audio.onended = () => {
        finish();
        resolve();
      };
      audio.onerror = () => {
        finish();
        reject(new Error("Audio playback failed"));
      };
      void audio.play().catch((err) => {
        finish();
        reject(err);
      });
    });
  }, []);

  const playSpeech = useCallback(
    async (text: string) => {
      if (!voiceOn) {
        setState("ready");
        return;
      }
      const parts = splitTextForTts(textForJarvisSpeech(text));
      if (parts.length === 0) {
        setState("ready");
        return;
      }
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          if (audioRef.current.src.startsWith("blob:")) {
            URL.revokeObjectURL(audioRef.current.src);
          }
          audioRef.current = null;
        }

        for (const part of parts) {
          const { base64, mimeType } = await synthesizeJarvisSpeech({ data: { text: part } });
          await playOneSegment(base64, mimeType);
        }
        setState("ready");
      } catch (error) {
        console.error("[jarvis] TTS failed:", error);
        toast.error(error instanceof Error ? error.message : "Voice playback failed");
        setState("ready");
      }
    },
    [playOneSegment, voiceOn],
  );

  const runQuery = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed || processingRef.current) return;

      processingRef.current = true;
      setState("processing");
      setTranscript(trimmed);

      try {
        const reply = await askJarvisAssistant({
          data: {
            message: trimmed,
            history: historyRef.current,
          },
        });

        historyRef.current = [
          ...historyRef.current.slice(-10),
          { role: "user", content: trimmed },
          { role: "assistant", content: reply.text },
        ];

        setResponse(reply.text);
        setState("responding");
        applyJarvisActions(reply.actions, resumeUrl);
        await playSpeech(reply.text);
        if (!voiceOn) {
          setTimeout(() => setState("ready"), 1800);
        }
      } catch (error) {
        console.error("[jarvis] ask failed:", error);
        toast.error(error instanceof Error ? error.message : "JARVIS could not respond");
        setState("ready");
      } finally {
        processingRef.current = false;
      }
    },
    [playSpeech, resumeUrl, voiceOn],
  );

  const transcribeRecording = useCallback(async () => {
    const chunks = audioChunksRef.current;
    if (chunks.length === 0) {
      throw new Error("EMPTY_AUDIO");
    }
    const blob = new Blob(chunks, { type: recordMimeRef.current });
    const audioBase64 = await blobToBase64(blob);
    const mimeType = recordMimeRef.current.split(";")[0]?.trim() || "audio/webm";
    const { transcript: text } = await transcribeJarvisSpeech({
      data: { audioBase64, mimeType },
    });
    return text;
  }, []);

  const startListening = useCallback(async () => {
    if (!supported || processingRef.current) return;

    setTranscript("");
    setResponse("");
    setState("listening");
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      recordMimeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, { mimeType });
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

      recorder.start(250);
    } catch (error) {
      console.error("[jarvis] listen failed:", error);
      toast.error(error instanceof Error ? error.message : "Could not start listening");
      cleanupListen();
      setState("ready");
    }
  }, [cleanupListen, supported]);

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
          const text = await transcribeRecording();
          setTranscript(text);
          cleanupListen();
          await runQuery(text);
        } catch (error) {
          console.error("[jarvis] transcribe failed:", error);
          toast.error(error instanceof Error ? error.message : "Could not understand audio");
          cleanupListen();
          setState("ready");
        }
      })();
    };

    try {
      recorder.stop();
    } catch {
      cleanupListen();
      setState("ready");
    }
  }, [cleanupListen, runQuery, transcribeRecording]);

  const cancelVoice = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current?.src) URL.revokeObjectURL(audioRef.current.src);
    audioRef.current = null;
  }, []);

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
