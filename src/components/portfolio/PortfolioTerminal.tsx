import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Maximize2, Minimize2, Terminal } from "lucide-react";
import type { PortfolioContent } from "@/lib/content.types";
import { cn } from "@/lib/utils";
import { getTabCompletion } from "@/lib/terminal/terminal-completion";
import {
  classifyOutputLine,
  isLsShortLine,
  type OutputLineKind,
} from "@/lib/terminal/terminal-output";
import {
  applyTerminalSideEffects,
  createInitialShellState,
  formatDisplayPath,
  getLastLoginLine,
  getMotdLines,
  getWelcomeLines,
  parsePromptParts,
  runShellCommand,
  TERMINAL_QUICK_CMDS,
} from "@/lib/terminal/terminal-shell";
import type { ShellState } from "@/lib/terminal/terminal.types";

type TerminalLine =
  | { type: "in"; text: string; cwd: string }
  | { type: "out"; text: string; kind: OutputLineKind }
  | { type: "interrupt" };

type PortfolioTerminalProps = {
  content: PortfolioContent;
  className?: string;
  screenClassName?: string;
  variant?: "hero" | "section";
  enableExpand?: boolean;
};

function TerminalPrompt({
  handle,
  cwd,
  className,
}: {
  handle: string;
  cwd: string;
  className?: string;
}) {
  const { userHost, path } = parsePromptParts(handle, cwd);
  return (
    <span className={cn("shrink-0 select-none", className)}>
      <span className="text-emerald">{userHost}</span>
      <span className="text-muted-foreground">:</span>
      <span className="text-cyan">{path}</span>
      <span className="text-muted-foreground">$</span>
    </span>
  );
}

function LsShortOutput({ text }: { text: string }) {
  const parts = text.split(/\s{2,}/).filter(Boolean);
  return (
    <span>
      {parts.map((part, i) => (
        <span key={`${part}-${i}`}>
          {i > 0 && "  "}
          <span className={part.endsWith("/") ? "text-cyan" : "text-foreground/85"}>
            {part}
          </span>
        </span>
      ))}
    </span>
  );
}

function OutputLine({ text, kind }: { text: string; kind: OutputLineKind }) {
  const resolvedKind = kind === "plain" && isLsShortLine(text, kind) ? "ls-short" : kind;

  if (resolvedKind === "ls-short") {
    return (
      <div className="pl-1 tabular-nums">
        <LsShortOutput text={text} />
      </div>
    );
  }

  const classByKind: Record<OutputLineKind, string> = {
    error: "text-destructive/90",
    hint: "text-emerald/80 italic",
    success: "text-emerald",
    "ls-short": "text-foreground/85",
    "ls-long": "text-foreground/80 tabular-nums",
    help: "text-muted-foreground",
    motd: "text-cyan/70",
    plain: "text-foreground/85",
  };

  if (resolvedKind === "ls-long") {
    const name = text.split(/\s{2,}/).pop() ?? text;
    const prefix = text.slice(0, text.length - name.length);
    return (
      <div className={cn("pl-1 whitespace-pre", classByKind["ls-long"])}>
        {prefix}
        <span className={name.endsWith("/") ? "text-cyan" : "text-foreground/85"}>{name}</span>
      </div>
    );
  }

  return (
    <div className={cn("pl-1 whitespace-pre-wrap", classByKind[resolvedKind])}>{text}</div>
  );
}

export function PortfolioTerminal({
  content,
  className,
  screenClassName,
  variant = "hero",
  enableExpand = true,
}: PortfolioTerminalProps) {
  const { profile } = content;
  const welcomeLines = getWelcomeLines(content);
  const [lastLoginLine, setLastLoginLine] = useState<string | undefined>(undefined);
  const motdLines = useMemo(
    () => getMotdLines(content, lastLoginLine),
    [content, lastLoginLine],
  );

  useEffect(() => {
    setLastLoginLine(getLastLoginLine());
  }, []);

  const [shellState, setShellState] = useState<ShellState>(createInitialShellState);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [ghostSuffix, setGhostSuffix] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = scrollContainerRef.current;
        if (el && stickToBottom) el.scrollTop = el.scrollHeight;
      });
    });
  }, [stickToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [lines, scrollToBottom]);

  useEffect(() => {
    if (!input.trim()) {
      setGhostSuffix("");
      return;
    }
    const completion = getTabCompletion(input, shellState.cwd, content);
    if (completion && completion.length > input.length) {
      setGhostSuffix(completion.slice(input.length));
    } else {
      setGhostSuffix("");
    }
  }, [input, shellState.cwd, content]);

  const submit = useCallback(
    (cmd: string) => {
      const trimmed = cmd.trim();
      if (!trimmed) return;

      const cwdAtSubmit = shellState.cwd;
      const { output, clear, state: nextState, effects } = runShellCommand(
        trimmed,
        shellState,
        content,
      );

      setShellState(nextState);
      setHistoryIndex(null);
      setStickToBottom(true);

      if (clear) {
        setLines([]);
        applyTerminalSideEffects(effects);
        return;
      }

      setLines((prev) => [
        ...prev,
        { type: "in", text: trimmed, cwd: cwdAtSubmit },
        ...output.map((t) => ({
          type: "out" as const,
          text: t,
          kind: classifyOutputLine(t),
        })),
      ]);
      applyTerminalSideEffects(effects);
    },
    [shellState, content],
  );

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

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    setStickToBottom(atBottom);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      handleHistoryKey("up");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      handleHistoryKey("down");
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const completion = getTabCompletion(input, shellState.cwd, content);
      if (completion) setInput(completion);
      return;
    }
    if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      submit("clear");
      return;
    }
    if (e.key === "c" && e.ctrlKey) {
      e.preventDefault();
      if (input) {
        setInput("");
        setHistoryIndex(null);
      } else {
        setLines((prev) => [...prev, { type: "interrupt" }]);
      }
    }
  };

  const shellBody = (
    <>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={cn(
          "font-mono text-xs sm:text-[13px] p-3 sm:p-4 md:p-5 min-h-0 overflow-y-auto overscroll-contain leading-snug tabular-nums",
          variant === "hero" ? "flex-1" : "flex-none",
          screenClassName ?? (variant === "section" ? "h-[min(340px,50dvh)] sm:h-[420px]" : undefined),
        )}
      >
        {lines.length === 0 && (
          <>
            <div className="text-foreground/85 whitespace-pre-wrap pl-1">{welcomeLines[0]}</div>
            <div className="text-foreground/85 whitespace-pre-wrap pl-1 mb-2">{welcomeLines[1]}</div>
            {motdLines.map((line) => (
              <div
                key={line || "spacer"}
                className={cn(
                  "pl-1 whitespace-pre-wrap",
                  line ? "text-cyan/70" : "h-2",
                )}
              >
                {line}
              </div>
            ))}
          </>
        )}

        {lines.map((line, i) => {
          if (line.type === "in") {
            return (
              <div key={i} className="flex flex-wrap items-baseline gap-x-1">
                <TerminalPrompt handle={profile.handle} cwd={line.cwd} />
                <span className="text-foreground break-all">{line.text}</span>
              </div>
            );
          }
          if (line.type === "interrupt") {
            return (
              <div key={i} className="text-muted-foreground pl-1">
                ^C
              </div>
            );
          }
          return <OutputLine key={i} text={line.text} kind={line.kind} />;
        })}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
            setInput("");
          }}
          className="flex items-baseline gap-x-1 mt-1 min-w-0"
        >
          <TerminalPrompt handle={profile.handle} cwd={shellState.cwd} />
          <div className="relative flex-1 min-w-0 h-[1.25em] flex items-center">
            <span className="pointer-events-none absolute inset-0 flex items-center min-w-0 overflow-hidden">
              <span className="text-foreground truncate">{input}</span>
              {ghostSuffix && (
                <span className="text-muted-foreground/40 truncate">{ghostSuffix}</span>
              )}
              <span className="terminal-block-cursor shrink-0" aria-hidden />
            </span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setHistoryIndex(null);
              }}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoComplete="off"
              aria-label="terminal input"
              className="absolute inset-0 w-full bg-transparent outline-none text-transparent caret-transparent selection:bg-cyan/20 min-w-0"
            />
          </div>
        </form>
      </div>

      <div className="border-t border-cyan/15 bg-background/30 shrink-0">
        <button
          type="button"
          onClick={() => setCheatsheetOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 px-3 sm:px-4 py-2 font-mono text-[10px] sm:text-[11px] text-muted-foreground hover:text-cyan transition-colors"
        >
          <span>Suggested commands</span>
          {cheatsheetOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
        {cheatsheetOpen && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 px-3 sm:px-4 pb-2.5 sm:pb-3">
            {TERMINAL_QUICK_CMDS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => submit(q)}
                className="font-mono text-[9px] sm:text-[11px] px-2 sm:px-3 py-1.5 sm:py-2 min-h-7 sm:min-h-9 rounded-md border border-cyan/30 text-cyan hover:bg-cyan/10 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const titleBar = (
    <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-cyan/15 bg-background/30 shrink-0 min-w-0">
      <div className="flex items-center gap-2 shrink-0 min-w-0">
        <Terminal className="size-3.5 text-cyan shrink-0" />
        <span className="font-mono text-[10px] sm:text-[11px] text-muted-foreground truncate">
          portfolio-shell
        </span>
      </div>
      <span className="font-mono text-[10px] sm:text-[11px] truncate min-w-0 flex-1 text-center px-1">
        <span className="text-emerald">{profile.handle}</span>
        <span className="text-muted-foreground">:</span>
        <span className="text-cyan">{formatDisplayPath(shellState.cwd)}</span>
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {enableExpand && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="p-1 rounded text-muted-foreground hover:text-cyan transition-colors"
            aria-label={expanded ? "Minimize terminal" : "Expand terminal"}
          >
            {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
        )}
        <span className="font-mono text-[9px] sm:text-[10px] text-emerald">● live</span>
      </div>
    </div>
  );

  const terminalChrome = (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden scanline bg-background/40 backdrop-blur-md ring-1 ring-cyan/15 flex flex-col w-full h-full",
        expanded && "shadow-2xl shadow-cyan/10",
        className,
      )}
      onClick={() => inputRef.current?.focus({ preventScroll: true })}
    >
      {titleBar}
      {shellBody}
    </div>
  );

  return (
    <>
      {expanded && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
          aria-hidden
        />
      )}
      {expanded && variant === "hero" && (
        <div
          className="min-h-[220px] sm:min-h-[260px] lg:min-h-0 w-full shrink-0"
          aria-hidden
        />
      )}
      <div
        className={cn(
          expanded &&
            "fixed inset-3 sm:inset-6 md:inset-10 z-50 flex flex-col max-h-[calc(100dvh-1.5rem)]",
          !expanded && variant === "hero" && "h-full min-h-[220px] sm:min-h-[260px] lg:min-h-0",
          !expanded && "relative w-full",
        )}
      >
        {terminalChrome}
      </div>
    </>
  );
}
