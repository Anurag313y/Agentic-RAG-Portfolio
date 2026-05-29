import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Download,
  Mail,
  Mic,
  MicOff,
  Sparkles,
  TerminalSquare,
  Volume2,
  VolumeX,
  Cpu,
} from "lucide-react";
import { PROFILE, PROJECTS, SKILLS } from "@/lib/portfolio-data";

type JarvisState = "ready" | "listening" | "processing" | "responding";

const SUGGESTIONS = [
  "Who is Anurag?",
  "Show me best projects",
  "What are his strongest skills?",
  "How can I contact him?",
  "Open the resume",
];

function answerFor(raw: string): { text: string; action?: () => void } {
  const q = raw.toLowerCase().trim();
  if (!q) return { text: "I didn't catch that. Try asking about projects, skills, or contact." };

  if (/(who|about|tell me|intro)/.test(q))
    return {
      text: `${PROFILE.name} is a ${PROFILE.role}. ${PROFILE.headline} Based in ${PROFILE.location}.`,
    };

  if (/(project|work|portfolio|build)/.test(q)) {
    const top = PROJECTS.slice(0, 3).map((p) => p.title).join(", ");
    return {
      text: `His top projects include ${top}. Scrolling to the projects section now.`,
      action: () => document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" }),
    };
  }

  if (/(skill|stack|tech|language)/.test(q)) {
    const flat = SKILLS.flatMap((s) => s.items).slice(0, 8).join(", ");
    return { text: `Strongest skills: ${flat}, and more. Showing the full stack now.`,
      action: () => document.getElementById("skills")?.scrollIntoView({ behavior: "smooth" }) };
  }

  if (/(contact|email|reach|hire|talk|message)/.test(q))
    return {
      text: `Easiest path: email ${PROFILE.email}. Opening the contact channel.`,
      action: () => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }),
    };

  if (/(resume|cv|pdf)/.test(q))
    return {
      text: "Opening the resume in a new tab.",
      action: () => window.open(PROFILE.resumeUrl, "_blank", "noopener,noreferrer"),
    };

  if (/(experience|company|job|history)/.test(q))
    return {
      text: "Here is his work history — taking you to the experience section.",
      action: () => document.getElementById("experience")?.scrollIntoView({ behavior: "smooth" }),
    };

  if (/(terminal|cli|shell|console|linux)/.test(q))
    return {
      text: "Launching the developer console.",
      action: () => document.getElementById("terminal")?.scrollIntoView({ behavior: "smooth" }),
    };

  return {
    text: `Try: "show projects", "what are his skills", "contact info", or "open resume".`,
  };
}

// Web Speech API (frontend-only, no backend)
function getRecognition(): any | null {
  if (typeof window === "undefined") return null;
  const SR =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = "en-US";
  r.interimResults = true;
  r.continuous = false;
  return r;
}

export function Hero() {
  const [state, setState] = useState<JarvisState>("ready");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState<string>("");
  const [voiceOn, setVoiceOn] = useState(true);
  const [supported, setSupported] = useState(true);
  const recogRef = useRef<any>(null);
  const finalRef = useRef<string>("");

  useEffect(() => {
    const r = getRecognition();
    if (!r) {
      setSupported(false);
      return;
    }
    r.onresult = (e: any) => {
      let final = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) finalRef.current = final;
      setTranscript((finalRef.current + " " + interim).trim());
    };
    r.onerror = () => setState("ready");
    r.onend = () => {
      const q = finalRef.current.trim();
      if (q) handleQuery(q);
      else setState("ready");
    };
    recogRef.current = r;
    return () => {
      try { r.stop(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!voiceOn || typeof window === "undefined" || !("speechSynthesis" in window)) {
        setState("ready");
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.02;
      u.pitch = 0.95;
      u.onend = () => setState("ready");
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    },
    [voiceOn],
  );

  const handleQuery = useCallback(
    (q: string) => {
      setState("processing");
      setTranscript(q);
      setTimeout(() => {
        const { text, action } = answerFor(q);
        setResponse(text);
        setState("responding");
        action?.();
        speak(text);
        if (!voiceOn) setTimeout(() => setState("ready"), 1800);
      }, 600);
    },
    [speak, voiceOn],
  );

  const startListening = () => {
    if (!recogRef.current) return;
    finalRef.current = "";
    setTranscript("");
    setResponse("");
    setState("listening");
    try {
      recogRef.current.start();
    } catch {
      setState("ready");
    }
  };

  const stopListening = () => {
    try { recogRef.current?.stop(); } catch {}
  };

  const statusMeta = useMemo(
    () =>
      ({
        ready: { label: "ready · tap mic to talk", dot: "bg-emerald" },
        listening: { label: "listening…", dot: "bg-cyan" },
        processing: { label: "processing", dot: "bg-yellow-400" },
        responding: { label: "responding", dot: "bg-cyan-glow" },
      })[state],
    [state],
  );

  return (
    <section id="home" className="relative min-h-[100svh] pt-28 pb-12 overflow-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-[1fr_1.05fr] gap-10 items-center">
        {/* LEFT — identity */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass font-mono text-xs text-cyan">
            <span className="size-2 rounded-full bg-emerald animate-pulse" />
            online · available for work
          </div>
          <h1 className="mt-5 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
            <span className="block text-foreground">{PROFILE.name}</span>
            <span className="block text-gradient">{PROFILE.role}</span>
          </h1>
          <p className="mt-5 text-lg text-foreground/85 max-w-xl">{PROFILE.headline}</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">{PROFILE.intro}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#projects"
              className="group inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-cyan text-primary-foreground font-medium glow-cyan hover:bg-cyan-glow transition-all"
            >
              View Projects
              <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <a
              href="#resume"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg glass glass-hover font-medium"
            >
              <Download className="size-4" /> View Resume
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-emerald/40 text-emerald hover:bg-emerald/10 transition-colors font-medium"
            >
              <Mail className="size-4" /> Contact Me
            </a>
          </div>

          {/* Secondary: terminal CTA — feels like a feature, not nav */}
          <a
            href="#terminal"
            className="mt-6 inline-flex items-center gap-3 px-4 py-2.5 rounded-lg font-mono text-xs glass glass-hover group"
          >
            <TerminalSquare className="size-4 text-cyan" />
            <span className="text-muted-foreground">
              <span className="text-emerald">$</span> Access Linux Environment
            </span>
            <span className="text-cyan opacity-70 group-hover:opacity-100 transition-opacity">→</span>
          </a>

          <div className="mt-8 grid grid-cols-3 max-w-md gap-3 font-mono">
            {[
              { k: "5+", v: "years" },
              { k: "30+", v: "projects" },
              { k: "99.9%", v: "uptime" },
            ].map((s) => (
              <div key={s.v} className="glass rounded-xl p-3 text-center">
                <div className="text-xl text-cyan font-semibold">{s.k}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.v}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* RIGHT — JARVIS interactive panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          className="relative"
        >
          <div className="glass rounded-2xl p-5 sm:p-6 relative overflow-hidden scanline">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-md bg-cyan/15 border border-cyan/40 grid place-items-center">
                  <Cpu className="size-3.5 text-cyan" />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold">J.A.R.V.I.S</div>
                  <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                    portfolio assistant
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!voiceOn) setVoiceOn(true);
                  else {
                    setVoiceOn(false);
                    window.speechSynthesis?.cancel();
                  }
                }}
                className="text-xs text-muted-foreground hover:text-cyan inline-flex items-center gap-1.5 font-mono"
                aria-label="toggle voice output"
              >
                {voiceOn ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
                {voiceOn ? "voice on" : "voice off"}
              </button>
            </div>

            {/* Orb + mic */}
            <div className="relative aspect-square max-w-[360px] mx-auto">
              <div className="absolute inset-0 grid place-items-center">
                <div
                  className={`absolute size-[88%] rounded-full border border-cyan/20 spin-slow ${
                    state === "listening" ? "opacity-100" : "opacity-70"
                  }`}
                />
                <div
                  className="absolute size-[72%] rounded-full border border-emerald/20 spin-slow"
                  style={{ animationDirection: "reverse", animationDuration: "24s" }}
                />
                <div
                  className="absolute size-[60%] rounded-full border border-cyan/10 spin-slow"
                  style={{ animationDuration: "30s" }}
                />
                <div
                  className={`absolute size-[58%] rounded-full bg-cyan/20 blur-3xl pulse-ring ${
                    state === "listening" ? "!bg-cyan/40" : ""
                  } ${state === "processing" ? "!bg-yellow-400/30" : ""}`}
                />

                {/* Center mic */}
                <button
                  onClick={state === "listening" ? stopListening : startListening}
                  disabled={!supported || state === "processing" || state === "responding"}
                  aria-label={state === "listening" ? "stop listening" : "start listening"}
                  className={`relative size-[46%] rounded-full grid place-items-center transition-all
                    bg-gradient-to-br from-cyan/40 via-cyan/10 to-emerald/30 glow-cyan float-orb
                    ${state === "listening" ? "scale-[1.04]" : ""}
                    ${!supported ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.03] cursor-pointer"}`}
                >
                  <div className="size-[68%] rounded-full bg-background/70 backdrop-blur grid place-items-center border border-cyan/40">
                    {state === "listening" ? (
                      <Mic className="size-1/3 text-cyan animate-pulse" />
                    ) : !supported ? (
                      <MicOff className="size-1/3 text-muted-foreground" />
                    ) : (
                      <Mic className="size-1/3 text-cyan" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Status pill */}
            <div className="flex items-center justify-center gap-2 mt-3 font-mono text-[11px] uppercase tracking-widest">
              <span className={`size-1.5 rounded-full ${statusMeta.dot} ${state !== "ready" ? "animate-pulse" : ""}`} />
              <span className="text-muted-foreground">{statusMeta.label}</span>
            </div>

            {/* Transcript / response */}
            <div className="mt-4 rounded-xl bg-background/50 border border-border/60 p-4 font-mono text-sm min-h-[110px]">
              <AnimatePresence mode="wait">
                {transcript && (
                  <motion.div
                    key={"t-" + transcript}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-foreground/80"
                  >
                    <span className="text-cyan">you ›</span> {transcript}
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence mode="wait">
                {state === "processing" && (
                  <motion.div
                    key="proc"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mt-2 text-muted-foreground"
                  >
                    <Sparkles className="inline size-3.5 mr-1 text-cyan" />
                    thinking<span className="caret">▍</span>
                  </motion.div>
                )}
                {response && state !== "processing" && (
                  <motion.div
                    key={"r-" + response}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 text-foreground/95"
                  >
                    <span className="text-emerald">jarvis ›</span> {response}
                  </motion.div>
                )}
                {!transcript && !response && (
                  <motion.div
                    key="hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-muted-foreground text-xs leading-relaxed"
                  >
                    {supported
                      ? "Tap the mic and ask anything — projects, skills, contact. Or pick a suggestion below."
                      : "Voice not supported in this browser. Use the suggestions below to query JARVIS."}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Suggestions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleQuery(s)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-cyan hover:border-cyan/50 transition-colors font-mono"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}