import { useRef, useState } from "react";
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
import { useJarvisVoice } from "@/hooks/use-jarvis-voice";
import type { PortfolioContent } from "@/lib/content.types";
import { resolveResumeUrl } from "@/lib/resume";

type HeroMode = "jarvis" | "terminal";

const SUGGESTIONS = [
  "Who is Anurag?",
  "Show me best projects",
  "What are his strongest skills?",
  "How can I contact him?",
  "Open the resume",
];

export function Hero() {
  const content = usePortfolio();
  const { profile } = content;
  const [mode, setMode] = useState<HeroMode>("jarvis");
  const {
    state,
    transcript,
    response,
    voiceOn,
    setVoiceOn,
    supported,
    statusMeta,
    startListening,
    stopListening,
    handleQuery,
    cancelVoice,
  } = useJarvisVoice(content.resumeUrl);

  return (
    <section id="home" className="relative min-h-0 lg:min-h-[100svh] pt-20 sm:pt-28 pb-6 sm:pb-12 overflow-hidden scroll-mt-24">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="section-container grid lg:grid-cols-[1fr_1.05fr] gap-5 sm:gap-8 lg:gap-10 items-start lg:items-stretch">
        {/* LEFT — stats pin to bottom on lg to match JARVIS panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="self-start w-full lg:self-stretch lg:flex lg:flex-col"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass font-mono text-xs text-cyan">
            <span className="size-2 rounded-full bg-emerald animate-pulse" />
            online · available for work
          </div>
          <h1 className="mt-3 sm:mt-5 text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
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

          <div className="mt-6 sm:mt-8 lg:mt-auto grid grid-cols-3 max-w-md gap-1.5 sm:gap-3 font-mono w-full">
            {[
              { k: "1+", v: "years" },
              { k: "30+", v: "projects" },
              { k: "99.9%", v: "uptime" },
            ].map((s) => (
              <div key={s.v} className="glass rounded-lg sm:rounded-xl p-2 sm:p-3 text-center min-w-0">
                <div className="text-base sm:text-xl text-cyan font-semibold truncate">{s.k}</div>
                <div className="text-[8px] xs:text-[10px] uppercase tracking-wide sm:tracking-widest text-muted-foreground leading-tight">
                  {s.v}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* RIGHT — JARVIS / Terminal hologram (borderless) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          className="relative w-full self-start lg:self-stretch lg:flex lg:flex-col lg:min-h-0"
        >
          <div className="relative flex flex-col lg:flex-1 lg:min-h-0">
            {/* Top floating toolbar */}
            <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between mb-2 sm:mb-3 lg:mb-2 gap-3 shrink-0">
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
                className="relative inline-flex self-start xs:self-auto p-0.5 sm:p-1 rounded-full font-mono text-[10px] sm:text-[11px] bg-background/40 backdrop-blur border border-cyan/20 shrink-0 max-w-full"
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
                  className={`relative z-10 px-2.5 sm:px-3 py-2 min-h-9 rounded-full inline-flex items-center gap-1 sm:gap-1.5 transition-colors ${
                    mode === "jarvis" ? "text-cyan" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Cpu className="size-3 shrink-0" /> <span className="hidden xs:inline">J.A.R.V.I.S</span><span className="xs:hidden">AI</span>
                </button>
                <button
                  role="tab"
                  aria-selected={mode === "terminal"}
                  onClick={() => setMode("terminal")}
                  className={`relative z-10 px-2.5 sm:px-3 py-2 min-h-9 rounded-full inline-flex items-center gap-1 sm:gap-1.5 transition-colors ${
                    mode === "terminal" ? "text-cyan" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <TerminalSquare className="size-3 shrink-0" /> <span className="hidden xs:inline">Linux Terminal</span><span className="xs:hidden">CLI</span>
                </button>
              </div>
            </div>

            <div className="relative w-full min-h-[300px] sm:min-h-[380px] lg:min-h-0 lg:flex-1 lg:h-full">
              <motion.div
                key="jarvis"
                initial={false}
                animate={{ opacity: mode === "jarvis" ? 1 : 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`flex h-full min-h-full flex-col justify-between w-full ${
                  mode === "jarvis"
                    ? "relative z-10"
                    : "absolute inset-0 z-0 opacity-0 pointer-events-none"
                }`}
                aria-hidden={mode !== "jarvis"}
              >
                <div className="flex flex-col flex-1 justify-center min-h-0">
                  {/* Voice toggle (floating, no card) */}
                  <div className="flex items-center justify-end mb-1 lg:mb-0.5 shrink-0">
                    <button
                      onClick={() => {
                        if (!voiceOn) setVoiceOn(true);
                        else {
                          setVoiceOn(false);
                          cancelVoice();
                        }
                      }}
                      className="text-[11px] text-muted-foreground hover:text-cyan inline-flex items-center gap-1.5 font-mono min-h-8 px-2 rounded-md"
                      aria-label="toggle voice output"
                    >
                      {voiceOn ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
                      {voiceOn ? "voice on" : "voice off"}
                    </button>
                  </div>

                  {/* Hologram core — labels on outer frame; speaker inset for a small gap */}
                  <div className="relative aspect-square w-full max-w-[min(92vw,300px)] xs:max-w-[320px] sm:max-w-[350px] md:max-w-[min(100%,380px)] lg:max-w-[min(100%,400px)] xl:max-w-[420px] mx-auto">
                    {/* Micro HUD chips — fixed corners, left/right pairs share the same inset */}
                    <div className="pointer-events-none absolute inset-x-2 top-2 sm:inset-x-2.5 sm:top-2.5 flex justify-between items-start gap-2">
                      <span className="font-mono text-[8px] sm:text-[9px] text-cyan/70 tracking-widest leading-none">
                        SYS · 0x4A1F
                      </span>
                      <span className="font-mono text-[8px] sm:text-[9px] text-emerald/80 tracking-widest leading-none text-right">
                        ◉ LINK OK
                      </span>
                    </div>
                    <div className="pointer-events-none absolute inset-x-2 bottom-2 sm:inset-x-2.5 sm:bottom-2.5 flex justify-between items-end gap-2">
                      <span className="font-mono text-[8px] sm:text-[9px] text-cyan/60 tracking-widest leading-none">
                        FREQ 21.4kHz
                      </span>
                      <span className="font-mono text-[8px] sm:text-[9px] text-cyan/60 tracking-widest leading-none text-right">
                        CORE · STABLE
                      </span>
                    </div>

                    {/* Speaker + rings — inset leaves a thin gap before corner labels */}
                    <div className="absolute inset-[9%] sm:inset-[8%] grid place-items-center">
                      <div className="absolute inset-0 rounded-full bg-cyan/10 blur-3xl" />
                      <div className="absolute inset-[12%] rounded-full bg-emerald/10 blur-2xl" />

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

                        <div
                          className={`absolute size-[58%] rounded-full bg-cyan/15 blur-2xl pulse-ring ${
                            state === "listening" ? "!bg-cyan/40" : ""
                          } ${state === "processing" ? "!bg-yellow-400/25" : ""}`}
                        />

                        <button
                          onClick={state === "listening" ? stopListening : startListening}
                          disabled={!supported || state === "processing" || state === "responding"}
                          aria-label={state === "listening" ? "stop listening" : "start listening"}
                          className={`relative size-[48%] rounded-full grid place-items-center transition-all
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
                  </div>
                </div>

                <div className="shrink-0 mt-auto">
                  {/* Status */}
                  <div className="flex items-center justify-center gap-2 mt-1.5 lg:mt-1 font-mono text-[10px] sm:text-[11px] uppercase tracking-widest">
                    <span className={`size-1.5 rounded-full ${statusMeta.dot} ${state !== "ready" ? "animate-pulse" : ""}`} />
                    <span className="text-muted-foreground">{statusMeta.label}</span>
                  </div>

                  {/* Transcript / response — borderless, just a soft surface */}
                  <div className="mt-1.5 sm:mt-2 lg:mt-1.5 font-mono text-xs sm:text-sm min-h-[48px] sm:min-h-[52px] lg:min-h-[44px] px-1 break-words">
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
                          className="text-muted-foreground text-[11px] sm:text-xs leading-snug text-center"
                        >
                          {supported
                            ? "Tap the mic and ask anything — projects, skills, contact. Or pick a suggestion below."
                            : "Voice unavailable (mic permission or server voice config). Use the suggestions below to query JARVIS."}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Suggestions */}
                  <div className="mt-1.5 sm:mt-2 lg:mt-1.5 flex flex-wrap gap-1 sm:gap-1.5 justify-center pb-0">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleQuery(s)}
                        className="text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-1.5 min-h-8 rounded-full border border-cyan/20 text-muted-foreground hover:text-cyan hover:border-cyan/50 transition-colors font-mono bg-background/30 backdrop-blur"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.div
                key="terminal"
                initial={false}
                animate={{ opacity: mode === "terminal" ? 1 : 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`flex h-full min-h-full flex-col w-full ${
                  mode === "terminal"
                    ? "relative z-10"
                    : "absolute inset-0 z-0 opacity-0 pointer-events-none"
                }`}
                aria-hidden={mode !== "terminal"}
              >
                <HeroTerminal content={content} />
              </motion.div>
            </div>
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
    window.open(resolveResumeUrl(resumeUrl), "_blank", "noopener,noreferrer");
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
  const welcomeLines = getWelcomeLines(content);
  const [lines, setLines] = useState<TLine[]>([{ type: "in", text: "cd welcome" }]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollTerminalToBottom = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = scrollContainerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  };

  const submit = (cmd: string) => {
    const out = runHeroCommand(cmd, content);
    if (out[0] === "__CLEAR__") {
      setLines([]);
      scrollTerminalToBottom();
      return;
    }
    setLines((l) => [
      ...l,
      { type: "in", text: cmd },
      ...out.map((t) => ({ type: "out" as const, text: t })),
    ]);
    scrollTerminalToBottom();
    if (cmd.trim().toLowerCase().startsWith("sudo hire-me")) {
      setTimeout(() => {
        document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
      }, 600);
    }
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden scanline bg-background/40 backdrop-blur-md ring-1 ring-cyan/15 flex flex-col w-full h-full min-h-[220px] sm:min-h-[260px] lg:min-h-0"
      onClick={() => inputRef.current?.focus({ preventScroll: true })}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-cyan/15 bg-background/30 shrink-0 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="size-2 sm:size-2.5 rounded-full bg-destructive/80" />
          <span className="size-2 sm:size-2.5 rounded-full bg-yellow-500/80" />
          <span className="size-2 sm:size-2.5 rounded-full bg-emerald/80" />
        </div>
        <span className="font-mono text-[10px] sm:text-[11px] text-muted-foreground truncate min-w-0 flex-1 text-center px-1">
          {profile.handle}: ~/portfolio
        </span>
        <span className="font-mono text-[9px] sm:text-[10px] text-emerald shrink-0">● live</span>
      </div>

      {/* Screen */}
      <div
        ref={scrollContainerRef}
        className="font-mono text-xs sm:text-[13px] p-3 sm:p-4 md:p-5 flex-1 min-h-0 overflow-y-auto overscroll-contain leading-relaxed"
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

        {lines.length <= 1 && (
          <>
            <div className="text-foreground/85 whitespace-pre-wrap pl-1">
              {welcomeLines[0]}
            </div>
            <div className="text-foreground/85 whitespace-pre-wrap pl-1">
              {welcomeLines[1]}
            </div>
            <div className="pl-1 text-emerald/80 italic">{welcomeLines[2]}</div>
          </>
        )}

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
        <div ref={endRef} />
      </div>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-t border-cyan/15 bg-background/30 shrink-0">
        {QUICK_CMDS.map((q) => (
          <button
            key={q}
            onClick={() => submit(q)}
            className="font-mono text-[10px] sm:text-[11px] px-2.5 sm:px-3 py-2 min-h-9 rounded-md border border-cyan/30 text-cyan hover:bg-cyan/10 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}