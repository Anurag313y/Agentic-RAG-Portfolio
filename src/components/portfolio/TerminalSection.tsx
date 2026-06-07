import { useEffect, useRef, useState } from "react";
import { SectionHeading } from "./SectionHeading";
import { EXPERIENCE, PROFILE, PROJECTS, SKILLS } from "@/lib/portfolio-data";
import type { PortfolioContent } from "@/lib/content.types";
import {
  applyTerminalSideEffects,
  createInitialShellState,
  formatDisplayPath,
  formatTerminalPrompt,
  getWelcomeLines,
  runShellCommand,
  TERMINAL_QUICK_CMDS,
} from "@/lib/terminal/terminal-shell";
import type { ShellState } from "@/lib/terminal/terminal.types";

type Line = { type: "in" | "out"; text: string; prompt?: string };

const STATIC_CONTENT: PortfolioContent = {
  profile: PROFILE,
  skills: SKILLS,
  projects: PROJECTS,
  experience: EXPERIENCE,
  about: PROFILE.intro,
  resumeUrl: PROFILE.resumeUrl,
};

export function TerminalSection() {
  const welcomeLines = getWelcomeLines(STATIC_CONTENT);
  const [shellState, setShellState] = useState<ShellState>(createInitialShellState);
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [lines]);

  const submit = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const prompt = formatTerminalPrompt(PROFILE.handle, shellState.cwd);
    const { output, clear, state: nextState, effects } = runShellCommand(
      trimmed,
      shellState,
      STATIC_CONTENT,
    );

    setShellState(nextState);
    setHistoryIndex(null);

    if (clear) {
      setLines([]);
      applyTerminalSideEffects(effects);
      return;
    }

    setLines((prev) => [
      ...prev,
      { type: "in", text: trimmed, prompt },
      ...output.map((t) => ({ type: "out" as const, text: t })),
    ]);
    applyTerminalSideEffects(effects);
  };

  const handleHistoryKey = (direction: "up" | "down") => {
    const { history } = shellState;
    if (history.length === 0) return;

    if (direction === "up") {
      const nextIndex =
        historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInput(history[nextIndex] ?? "");
      return;
    }

    if (historyIndex === null) return;
    const nextIndex = historyIndex + 1;
    if (nextIndex >= history.length) {
      setHistoryIndex(null);
      setInput("");
      return;
    }
    setHistoryIndex(nextIndex);
    setInput(history[nextIndex] ?? "");
  };

  const currentPrompt = formatTerminalPrompt(PROFILE.handle, shellState.cwd);

  return (
    <section id="terminal" className="py-12 sm:py-16 relative">
      <div className="section-container">
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
          <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border/60 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="size-2.5 sm:size-3 rounded-full bg-destructive/80" />
              <span className="size-2.5 sm:size-3 rounded-full bg-yellow-500/80" />
              <span className="size-2.5 sm:size-3 rounded-full bg-emerald/80" />
            </div>
            <span className="font-mono text-[10px] sm:text-xs text-muted-foreground truncate min-w-0 flex-1 text-center">
              {PROFILE.handle}: {formatDisplayPath(shellState.cwd)}
            </span>
            <span className="font-mono text-[9px] sm:text-[10px] text-emerald shrink-0">● live</span>
          </div>

          <div
            ref={scrollContainerRef}
            className="font-mono text-xs sm:text-sm p-3 sm:p-4 md:p-6 h-[min(340px,50dvh)] sm:h-[420px] overflow-y-auto"
          >
            {lines.map((l, i) =>
              l.type === "in" ? (
                <div key={i}>
                  <span className="text-muted-foreground">{l.prompt ?? currentPrompt}</span>{" "}
                  <span className="text-foreground">{l.text}</span>
                </div>
              ) : (
                <div key={i} className="text-muted-foreground whitespace-pre-wrap pl-1">
                  {l.text}
                </div>
              ),
            )}

            {lines.length === 0 && (
              <>
                {welcomeLines.map((line, i) => (
                  <div
                    key={line}
                    className={
                      i >= 2
                        ? "pl-1 text-emerald/80 italic whitespace-pre-wrap"
                        : "text-muted-foreground whitespace-pre-wrap pl-1"
                    }
                  >
                    {line}
                  </div>
                ))}
              </>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(input);
                setInput("");
              }}
              className="flex items-center gap-2 mt-1 min-w-0"
            >
              <span className="text-muted-foreground shrink-0">{currentPrompt}</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setHistoryIndex(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    handleHistoryKey("up");
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    handleHistoryKey("down");
                  }
                }}
                spellCheck={false}
                autoComplete="off"
                aria-label="terminal input"
                className="flex-1 bg-transparent outline-none text-foreground caret-cyan min-w-0"
              />
            </form>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-t border-border/60">
            {TERMINAL_QUICK_CMDS.map((q) => (
              <button
                key={q}
                onClick={() => submit(q)}
                className="font-mono text-[10px] sm:text-xs px-2.5 sm:px-3 py-2 min-h-9 rounded-md border border-cyan/30 text-cyan hover:bg-cyan/10 transition-colors"
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
