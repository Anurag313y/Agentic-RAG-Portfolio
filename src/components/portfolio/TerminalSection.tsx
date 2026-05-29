import { useEffect, useRef, useState } from "react";
import { SectionHeading } from "./SectionHeading";
import { PROFILE, SKILLS, PROJECTS, EXPERIENCE } from "@/lib/portfolio-data";

type Line = { type: "in" | "out"; text: string };

const HELP = [
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

function runCommand(cmd: string): string[] {
  const c = cmd.trim().toLowerCase();
  if (!c) return [];
  if (c === "help" || c === "?") return HELP;
  if (c === "whoami")
    return [
      `${PROFILE.name} — ${PROFILE.role}`,
      PROFILE.headline,
      `location: ${PROFILE.location}`,
    ];
  if (c === "skills")
    return SKILLS.flatMap((s) => [`▸ ${s.category}`, `   ${s.items.join(", ")}`]);
  if (c === "projects")
    return PROJECTS.map((p) => `▸ ${p.title} — ${p.stack.join(" · ")}`);
  if (c === "experience")
    return EXPERIENCE.map((e) => `▸ ${e.role} @ ${e.company}  (${e.duration})`);
  if (c === "resume") {
    window.open(PROFILE.resumeUrl, "_blank", "noopener,noreferrer");
    return ["opening resume.pdf in a new tab..."];
  }
  if (c === "contact")
    return [
      `email:    ${PROFILE.email}`,
      `github:   ${PROFILE.socials.github}`,
      `linkedin: ${PROFILE.socials.linkedin}`,
    ];
  if (c === "sudo hire-me" || c === "hire-me")
    return [
      "[sudo] authenticating recruiter...",
      "✓ access granted.",
      "redirecting to contact section ↓",
    ];
  if (c === "clear") return ["__CLEAR__"];
  if (c === "ls") return ["about  skills  projects  experience  resume  contact"];
  return [`command not found: ${cmd}. try 'help'`];
}

const QUICK = ["whoami", "skills", "projects", "experience", "resume", "contact", "sudo hire-me"];

export function TerminalSection() {
  const [lines, setLines] = useState<Line[]>([
    { type: "out", text: `Welcome to ${PROFILE.handle} — type 'help' to begin.` },
  ]);
  const [input, setInput] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll only the terminal container, not the page
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [lines]);

  const submit = (cmd: string) => {
    const out = runCommand(cmd);
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
    <section id="terminal" className="py-12 sm:py-16 relative">
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <SectionHeading
          id="terminal"
          eyebrow="// developer console"
          title="Linux Command Line"
          description="A live shell wired to my portfolio. Prefer keys over clicks? Type a command or pick a chip."
        />

        <div
          className="glass rounded-2xl overflow-hidden scanline relative"
          onClick={() => inputRef.current?.focus()}
        >
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border/60">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 sm:size-3 rounded-full bg-destructive/80" />
              <span className="size-2.5 sm:size-3 rounded-full bg-yellow-500/80" />
              <span className="size-2.5 sm:size-3 rounded-full bg-emerald/80" />
            </div>
            <span className="font-mono text-[10px] sm:text-xs text-muted-foreground">
              {PROFILE.handle}: ~/portfolio
            </span>
            <span className="font-mono text-[9px] sm:text-[10px] text-emerald">● live</span>
          </div>

          <div
            ref={scrollContainerRef}
            className="font-mono text-xs sm:text-sm p-3 sm:p-4 md:p-6 h-[340px] sm:h-[420px] overflow-y-auto"
          >
            {lines.map((l, i) =>
              l.type === "in" ? (
                <div key={i}>
                  <span className="text-emerald">{PROFILE.handle}</span>
                  <span className="text-muted-foreground">:~$</span>{" "}
                  <span className="text-foreground">{l.text}</span>
                </div>
              ) : (
                <div key={i} className="text-muted-foreground whitespace-pre-wrap pl-1">
                  {l.text}
                </div>
              )
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(input);
                setInput("");
              }}
              className="flex items-center gap-2 mt-1"
            >
              <span className="text-emerald">{PROFILE.handle}</span>
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
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-t border-border/60">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => submit(q)}
                className="font-mono text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-md border border-cyan/30 text-cyan hover:bg-cyan/10 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}