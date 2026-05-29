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
import { usePortfolio } from "@/context/portfolio";
import type { PortfolioContent } from "@/lib/content.types";

type JarvisState = "ready" | "listening" | "processing" | "responding";
type HeroMode = "jarvis" | "terminal";

const SUGGESTIONS = [
  "Who is Anurag?",
  "Show me best projects",
  "What are his strongest skills?",
  "How can I contact him?",
  "Open the resume",
];

function answerFor(raw: string, content: PortfolioContent): { text: string; action?: () => void } {
  const { profile, projects, skills, experience, resumeUrl } = content;
  const q = raw.toLowerCase().trim();
  if (!q) return { text: "I didn't catch that. Try asking about projects, skills, or contact." };

  if (/(who|about|tell me|intro)/.test(q))
    return {
      text: `${profile.name} is a ${profile.role}. ${profile.headline} Based in ${profile.location}.`,
    };

  if (/(project|work|portfolio|build)/.test(q)) {
    const top = projects.slice(0, 3).map((p) => p.title).join(", ");
    return {
      text: `His top projects include ${top}. Scrolling to the projects section now.`,
      action: () => document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" }),
    };
  }

  if (/(skill|stack|tech|language)/.test(q)) {
    const flat = skills.flatMap((s) => s.items).slice(0, 8).join(", ");
    return {
      text: `Strongest skills: ${flat}, and more. Showing the full stack now.`,
      action: () => document.getElementById("skills")?.scrollIntoView({ behavior: "smooth" }),
    };
  }

  if (/(contact|email|reach|hire|talk|message)/.test(q))
    return {
      text: `Easiest path: email ${profile.email}. Opening the contact channel.`,
      action: () => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }),
    };

  if (/(resume|cv|pdf)/.test(q))
    return {
      text: "Opening the resume in a new tab.",
      action: () => window.open(resumeUrl, "_blank", "noopener,noreferrer"),
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
  const content = usePortfolio();
  const { profile } = content;
  const [state, setState] = useState<JarvisState>("ready");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState<string>("");
  const [voiceOn, setVoiceOn] = useState(true);
  const [supported, setSupported] = useState(true);
  const [mode, setMode] = useState<HeroMode>("jarvis");
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
        const { text, action } = answerFor(q, content);
        setResponse(text);
        setState("responding");
        action?.();
        speak(text);
        if (!voiceOn) setTimeout(() => setState("ready"), 1800);
      }, 600);
    },
    [speak, voiceOn, content],
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
    <section id="home" className="relative min-h-[100svh] pt-24 sm:pt-28 pb-8 sm:pb-12 overflow-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="mx-auto max-w-7xl px-3 sm:px-4 grid lg:grid-cols-[1fr_1.05fr] gap-8 lg:gap-10 items-center">
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
          <h1 className="mt-4 sm:mt-5 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
            <span className="block text-foreground">{profile.name}</span>
            <span className="block text-gradient">{profile.role}</span>
          </h1>
          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-foreground/85 max-w-xl">{profile.headline}</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">{profile.intro}</p>

          <div className="mt-5 sm:mt-7 flex flex-wrap gap-2 sm:gap-3">
            <a
              href="#projects"
              className="group inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg bg-cyan text-primary-foreground font-medium glow-cyan hover:bg-cyan-glow transition-all text-sm sm:text-base"
            >
              View Projects
              <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <a
              href="#resume"
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg glass glass-hover font-medium text-sm sm:text-base"
            >
              <Download className="size-4" /> View Resume
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg border border-emerald/40 text-emerald hover:bg-emerald/10 transition-colors font-medium text-sm sm:text-base"
            >
              <Mail className="size-4" /> Contact Me
            </a>
          </div>

          {/* Secondary: switch hero-right to terminal mode */}
          <button
            type="button"
            onClick={() => setMode("terminal")}
            className="mt-5 sm:mt-6 inline-flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-mono text-xs glass glass-hover group"
          >
            <TerminalSquare className="size-4 text-cyan" />
            <span className="text-muted-foreground">
              <span className="text-emerald">$</span> Access Linux Environment
            </span>
            <span className="text-cyan opacity-70 group-hover:opacity-100 transition-opacity">→</span>
          </button>

          <div className="mt-6 sm:mt-8 grid grid-cols-3 max-w-md gap-2 sm:gap-3 font-mono">
            {[
              { k: "1+", v: "years" },
              { k: "30+", v: "projects" },
              { k: "99.9%", v: "uptime" },
            ].map((s) => (
              <div key={s.v} className="glass rounded-xl p-2.5 sm:p-3 text-center">
                <div className="text-lg sm:text-xl text-cyan font-semibold">{s.k}</div>
                <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground">{s.v}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* RIGHT — JARVIS / Terminal hologram (borderless) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          className="relative w-full min-h-[600px] sm:min-h-[680px]"
        >
          {/* Borderless hero-right: top toolbar floats over a hologram surface */}
          <div className="relative min-h-full flex flex-col">
            {/* Top floating toolbar */}
            <div className="flex items-center justify-between mb-4 sm:mb-5 gap-2">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="size-7 sm:size-8 rounded-md bg-cyan/15 border border-cyan/40 grid place-items-center glow-cyan shrink-0">
                  <Cpu className="size-3.5 sm:size-4 text-cyan" />
                </div>
                <div className="leading-tight min-w-0">
                  {mode === "jarvis" ? (
                    <>
                      <div className="text-sm font-semibold tracking-wide">J.A.R.V.I.S</div>
                      <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                        portfolio assistant
                      </div>
                    </>
                  ) : (
                    <div className="font-mono text-xs text-cyan truncate">
                      <span className="text-emerald">$</span> cat /portfolio/terminal.md
                    </div>
                  )}
                </div>
              </div>

              {/* Segmented mode toggle */}
              <div
                role="tablist"
                aria-label="hero panel mode"
                className="relative inline-flex p-0.5 sm:p-1 rounded-full font-mono text-[10px] sm:text-[11px] bg-background/40 backdrop-blur border border-cyan/20 shrink-0"
              >
                <span
                  aria-hidden
                  className={`absolute top-0.5 sm:top-1 bottom-0.5 sm:bottom-1 w-[calc(50%-4px)] rounded-full bg-cyan/15 border border-cyan/40 transition-all duration-300 ease-out ${
                    mode === "jarvis" ? "left-0.5 sm:left-1" : "left-[calc(50%+0px)]"
                  }`}
                />
                <button
                  role="tab"
                  aria-selected={mode === "jarvis"}
                  onClick={() => setMode("jarvis")}
                  className={`relative z-10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full inline-flex items-center gap-1 sm:gap-1.5 transition-colors ${
                    mode === "jarvis" ? "text-cyan" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Cpu className="size-3" /> <span className="hidden xs:inline">J.A.R.V.I.S</span><span className="xs:hidden">AI</span>
                </button>
                <button
                  role="tab"
                  aria-selected={mode === "terminal"}
                  onClick={() => setMode("terminal")}
                  className={`relative z-10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full inline-flex items-center gap-1 sm:gap-1.5 transition-colors ${
                    mode === "terminal" ? "text-cyan" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <TerminalSquare className="size-3" /> <span className="hidden xs:inline">Linux Terminal</span><span className="xs:hidden">CLI</span>
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {mode === "jarvis" ? (
                <motion.div
                  key="jarvis"
                  initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="relative flex-1"
                >
                  {/* Voice toggle (floating, no card) */}
                  <div className="flex items-center justify-end mb-2">
                    <button
                      onClick={() => {
                        if (!voiceOn) setVoiceOn(true);
                        else {
                          setVoiceOn(false);
                          window.speechSynthesis?.cancel();
                        }
                      }}
                      className="text-[11px] text-muted-foreground hover:text-cyan inline-flex items-center gap-1.5 font-mono"
                      aria-label="toggle voice output"
                    >
                      {voiceOn ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
                      {voiceOn ? "voice on" : "voice off"}
                    </button>
                  </div>

                  {/* Hologram core */}
                  <div className="relative aspect-square max-w-[210px] xs:max-w-[250px] sm:max-w-[440px] mx-auto">
                    {/* Ambient glow */}
                    <div className="absolute inset-0 rounded-full bg-cyan/10 blur-3xl" />
                    <div className="absolute inset-[12%] rounded-full bg-emerald/10 blur-2xl" />

                    {/* HUD rings */}
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="absolute size-[96%] rounded-full border border-cyan/15 spin-slow" />
                      <div
                        className="absolute size-[82%] rounded-full border border-dashed border-cyan/25 spin-slow"
                        style={{ animationDirection: "reverse", animationDuration: "22s" }}
                      />
                      <div
                        className="absolute size-[68%] rounded-full border border-emerald/25 spin-slow"
                        style={{ animationDuration: "30s" }}
                      />
                      <div className="absolute size-[54%] rounded-full border border-cyan/30" />

                      {/* Tick marks */}
                      <svg
                        className="absolute size-[92%] text-cyan/40 spin-slow"
                        style={{ animationDuration: "40s" }}
                        viewBox="0 0 100 100"
                        fill="none"
                      >
                        {Array.from({ length: 36 }).map((_, i) => (
                          <line
                            key={i}
                            x1="50"
                            y1="2"
                            x2="50"
                            y2={i % 3 === 0 ? "6" : "4"}
                            stroke="currentColor"
                            strokeWidth="0.4"
                            transform={`rotate(${i * 10} 50 50)`}
                          />
                        ))}
                      </svg>

                      {/* Pulse ring on activity */}
                      <div
                        className={`absolute size-[58%] rounded-full bg-cyan/15 blur-2xl pulse-ring ${
                          state === "listening" ? "!bg-cyan/40" : ""
                        } ${state === "processing" ? "!bg-yellow-400/25" : ""}`}
                      />

                      {/* Micro HUD chips */}
                      <div className="absolute top-2 left-2 font-mono text-[8px] sm:text-[9px] text-cyan/70 tracking-widest">
                        SYS · 0x4A1F
                      </div>
                      <div className="absolute top-2 right-2 font-mono text-[8px] sm:text-[9px] text-emerald/80 tracking-widest">
                        ◉ LINK OK
                      </div>
                      <div className="absolute bottom-2 left-2 font-mono text-[8px] sm:text-[9px] text-cyan/60 tracking-widest">
                        FREQ 21.4kHz
                      </div>
                      <div className="absolute bottom-2 right-2 font-mono text-[8px] sm:text-[9px] text-cyan/60 tracking-widest">
                        CORE · STABLE
                      </div>

                      {/* Center mic */}
                      <button
                        onClick={state === "listening" ? stopListening : startListening}
                        disabled={!supported || state === "processing" || state === "responding"}
                        aria-label={state === "listening" ? "stop listening" : "start listening"}
                        className={`relative size-[40%] rounded-full grid place-items-center transition-all
                          bg-gradient-to-br from-cyan/50 via-cyan/15 to-emerald/40 glow-cyan float-orb
                          ${state === "listening" ? "scale-[1.05]" : ""}
                          ${!supported ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.03] cursor-pointer"}`}
                      >
                        <div className="size-[72%] rounded-full bg-background/70 backdrop-blur grid place-items-center border border-cyan/50">
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

                  {/* Status */}
                  <div className="flex items-center justify-center gap-2 mt-2 font-mono text-[10px] sm:text-[11px] uppercase tracking-widest">
                    <span className={`size-1.5 rounded-full ${statusMeta.dot} ${state !== "ready" ? "animate-pulse" : ""}`} />
                    <span className="text-muted-foreground">{statusMeta.label}</span>
                  </div>

                  {/* Transcript / response — borderless, just a soft surface */}
                  <div className="mt-3 font-mono text-xs sm:text-sm min-h-[80px] sm:min-h-[92px] px-1">
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
                          className="text-muted-foreground text-xs leading-relaxed text-center"
                        >
                          {supported
                            ? "Tap the mic and ask anything — projects, skills, contact. Or pick a suggestion below."
                            : "Voice not supported in this browser. Use the suggestions below to query JARVIS."}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Suggestions */}
                  <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2 justify-center">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleQuery(s)}
                        className="text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-1 rounded-full border border-cyan/20 text-muted-foreground hover:text-cyan hover:border-cyan/50 transition-colors font-mono bg-background/30 backdrop-blur"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="terminal"
                  initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="relative flex-1 flex flex-col"
                >
                  <HeroTerminal content={content} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================
   Inline Linux terminal for the hero-right (compact, premium)
   ============================================================ */

const TERMINAL_HELP = [
  "Available commands:",
  "  whoami       — about Anurag",
  "  skills       — list skills by category",
  "  projects     — featured projects",
  "  experience   — work history",
  "  resume       — open resume",
  "  contact      — contact details",
  "  sudo hire-me — let's talk",
  "  clear        — clear screen",
];

function runHeroCommand(cmd: string, content: PortfolioContent): string[] {
  const { profile, projects, skills, experience, resumeUrl } = content;
  const c = cmd.trim().toLowerCase();
  if (!c) return [];
  if (c === "help" || c === "?") return TERMINAL_HELP;
  if (c === "whoami")
    return [`${profile.name} — ${profile.role}`, profile.headline, `location: ${profile.location}`];
  if (c === "skills")
    return skills.flatMap((s) => [`▸ ${s.category}`, `   ${s.items.join(", ")}`]);
  if (c === "projects") return projects.map((p) => `▸ ${p.title} — ${p.stack.join(" · ")}`);
  if (c === "experience")
    return experience.map((e) => `▸ ${e.role} @ ${e.company}  (${e.duration})`);
  if (c === "resume") {
    window.open(resumeUrl, "_blank", "noopener,noreferrer");
    return ["opening resume.pdf in a new tab..."];
  }
  if (c === "contact")
    return [
      `email:    ${profile.email}`,
      `github:   ${profile.socials.github}`,
      `linkedin: ${profile.socials.linkedin}`,
    ];
  if (c === "sudo hire-me" || c === "hire-me")
    return ["[sudo] authenticating recruiter...", "✓ access granted.", "redirecting to contact ↓"];
  if (c === "clear") return ["__CLEAR__"];
  if (c === "ls") return ["about  skills  projects  experience  resume  contact"];
  if (c.startsWith("cd ")) {
    const target = c.slice(3).trim();
    const valid = ["about", "skills", "projects", "experience", "resume", "contact"];
    if (valid.includes(target)) {
      document.getElementById(target)?.scrollIntoView({ behavior: "smooth" });
      return [`→ navigating to /${target}`];
    }
    return [`cd: no such section: ${target}`];
  }
  return [`command not found: ${cmd}. try 'help'`];
}

const QUICK_CMDS = ["whoami", "skills", "projects", "resume", "sudo hire-me"];

type TLine = { type: "in" | "out" | "muted" | "heading" | "kv" | "hint"; text: string };

function getWelcomeLines(content: PortfolioContent) {
  return [
    `Hi, I'm ${content.profile.name}, a ${content.profile.role}.`,
    "Welcome to my interactive portfolio terminal.",
    "Type 'help' or 'ls' for commands. Use 'cd <name>' to open sections (e.g. cd about, cd projects, cd contact).",
  ];
}

function HeroTerminal({ content }: { content: PortfolioContent }) {
  const { profile } = content;
  const WELCOME_LINES = getWelcomeLines(content);
  const [lines, setLines] = useState<TLine[]>([{ type: "in", text: "cd welcome" }]);
  const [input, setInput] = useState("");
  const [typingLineIndex, setTypingLineIndex] = useState(0);
  const [typingCharIndex, setTypingCharIndex] = useState(0);
  const [introComplete, setIntroComplete] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Typing animation for welcome text
  useEffect(() => {
    if (introComplete) return;
    if (typingLineIndex >= WELCOME_LINES.length) {
      setIntroComplete(true);
      return;
    }

    const currentLine = WELCOME_LINES[typingLineIndex];
    if (typingCharIndex < currentLine.length) {
      const timeout = setTimeout(() => {
        setTypingCharIndex((prev) => prev + 1);
      }, 22);
      return () => clearTimeout(timeout);
    } else {
      // Finished current line, move to next after a small pause
      const timeout = setTimeout(() => {
        setTypingLineIndex((prev) => prev + 1);
        setTypingCharIndex(0);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [typingLineIndex, typingCharIndex, introComplete]);

  // Scroll ONLY the terminal container, not the page
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [lines, typingCharIndex]);

  // Focus input after intro is complete
  useEffect(() => {
    if (introComplete) {
      // Use preventScroll to stop the browser from jumping down to the input
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [introComplete]);

  const submit = (cmd: string) => {
    const out = runHeroCommand(cmd, content);
    if (out[0] === "__CLEAR__") {
      setLines([]);
      return;
    }
    setLines((l) => [
      ...l,
      { type: "in", text: cmd },
      ...out.map((t) => ({ type: "out" as const, text: t })),
    ]);
    if (cmd.trim().toLowerCase().startsWith("sudo hire-me")) {
      setTimeout(() => {
        document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
      }, 600);
    }
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden scanline bg-background/40 backdrop-blur-md ring-1 ring-cyan/15 flex flex-col h-full"
      onClick={() => introComplete && inputRef.current?.focus({ preventScroll: true })}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 border-b border-cyan/15 bg-background/30 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="size-2 sm:size-2.5 rounded-full bg-destructive/80" />
          <span className="size-2 sm:size-2.5 rounded-full bg-yellow-500/80" />
          <span className="size-2 sm:size-2.5 rounded-full bg-emerald/80" />
        </div>
        <span className="font-mono text-[10px] sm:text-[11px] text-muted-foreground">
          {profile.handle}: ~/portfolio
        </span>
        <span className="font-mono text-[9px] sm:text-[10px] text-emerald">● live</span>
      </div>

      {/* Screen */}
      <div
        ref={scrollContainerRef}
        className="font-mono text-xs sm:text-[13px] p-3 sm:p-4 md:p-5 flex-1 overflow-y-auto leading-relaxed"
      >
        {lines.map((l, i) => {
          if (l.type === "in") {
            return (
              <div key={i}>
                <span className="text-emerald">{profile.handle}</span>
                <span className="text-muted-foreground">:~$</span>{" "}
                <span className="text-foreground">{l.text}</span>
              </div>
            );
          }
          if (l.type === "muted") {
            return (
              <div key={i} className="text-cyan/60 pl-1 tracking-wide">
                {l.text}
              </div>
            );
          }
          if (l.type === "heading") {
            return (
              <div
                key={i}
                className="pl-1 mt-1 mb-1 text-base sm:text-lg font-semibold tracking-tight text-gradient"
              >
                {l.text}
              </div>
            );
          }
          if (l.type === "kv") {
            return (
              <div key={i} className="pl-1 text-foreground/80">
                <span className="text-cyan/80">›</span> {l.text}
              </div>
            );
          }
          if (l.type === "hint") {
            return (
              <div key={i} className="pl-1 text-emerald/80 italic">
                {l.text}
              </div>
            );
          }
          return (
            <div key={i} className="text-foreground/85 whitespace-pre-wrap pl-1">
              {l.text}
            </div>
          );
        })}

        {/* Typing animation for welcome text */}
        {!introComplete && (
          <>
            {Array.from({ length: typingLineIndex + 1 }).map((_, i) => {
              if (i >= WELCOME_LINES.length) return null;
              const isCurrentLine = i === typingLineIndex;
              const displayText = isCurrentLine
                ? WELCOME_LINES[i].slice(0, typingCharIndex)
                : i < typingLineIndex
                  ? WELCOME_LINES[i]
                  : "";
              if (!displayText) return null;

              const lineType = i === 2 ? "hint" : "out";
              return (
                <div
                  key={`typing-${i}`}
                  className={
                    lineType === "hint"
                      ? "pl-1 text-emerald/80 italic"
                      : "text-foreground/85 whitespace-pre-wrap pl-1"
                  }
                >
                  {displayText}
                  {isCurrentLine && <span className="caret">▍</span>}
                </div>
              );
            })}
          </>
        )}

        {/* Show the static welcome text after intro is complete */}
        {introComplete && lines.length <= 1 && (
          <>
            <div className="text-foreground/85 whitespace-pre-wrap pl-1">
              {WELCOME_LINES[0]}
            </div>
            <div className="text-foreground/85 whitespace-pre-wrap pl-1">
              {WELCOME_LINES[1]}
            </div>
            <div className="pl-1 text-emerald/80 italic">
              {WELCOME_LINES[2]}
            </div>
          </>
        )}

        {introComplete && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
              setInput("");
            }}
            className="flex items-center gap-2 mt-1"
          >
            <span className="text-emerald">{profile.handle}</span>
            <span className="text-muted-foreground">:~$</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              aria-label="terminal input"
              className="flex-1 bg-transparent outline-none text-foreground caret-cyan min-w-0"
            />
          </form>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-t border-cyan/15 bg-background/30 shrink-0">
        {QUICK_CMDS.map((q) => (
          <button
            key={q}
            onClick={() => {
              if (!introComplete) return;
              submit(q);
            }}
            disabled={!introComplete}
            className="font-mono text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-1 rounded-md border border-cyan/30 text-cyan hover:bg-cyan/10 transition-colors disabled:opacity-40"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}