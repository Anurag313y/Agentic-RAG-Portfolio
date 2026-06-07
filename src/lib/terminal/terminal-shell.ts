import type { PortfolioContent } from "@/lib/content.types";
import { resolveResumeUrl } from "@/lib/resume";
import {
  HOME_PATH,
  XDG_OPEN_SECTIONS,
  type CommandResult,
  type FsDir,
  type FsNode,
  type ShellState,
  type SideEffect,
  type VirtualFsContext,
} from "./terminal.types";

export const TERMINAL_HELP = [
  "Available commands:",
  "  pwd              — print working directory",
  "  cd [path]        — change directory (.., ~, or path)",
  "  ls [-l] [path]   — list directory contents",
  "  cat <file>       — print file contents",
  "  whoami           — about the portfolio owner",
  "  echo <text>      — print text",
  "  history          — command history",
  "  xdg-open <target>— open site section or resume.pdf",
  "  sudo hire-me     — recruiter easter egg",
  "  clear            — clear screen",
  "  help             — show this help",
];

export const TERMINAL_QUICK_CMDS = [
  "ls",
  "whoami",
  "cd projects",
  "cat about/README",
  "xdg-open contact",
];

export function createInitialShellState(): ShellState {
  return { cwd: HOME_PATH, history: [] };
}

export function formatDisplayPath(cwd: string): string {
  if (cwd === HOME_PATH) return "~/portfolio";
  if (cwd.startsWith(`${HOME_PATH}/`)) {
    return `~/portfolio${cwd.slice(HOME_PATH.length)}`;
  }
  return cwd;
}

export function formatTerminalPrompt(handle: string, cwd: string): string {
  return `${handle}:${formatDisplayPath(cwd)}$`;
}

export function parsePromptParts(handle: string, cwd: string) {
  return {
    userHost: handle,
    path: formatDisplayPath(cwd),
  };
}

export function getWelcomeLines(content: PortfolioContent): string[] {
  return [
    `Hi, I'm ${content.profile.name}, a ${content.profile.role}.`,
    "Welcome to my interactive portfolio terminal.",
    "Type 'help' or 'ls' to explore ~/portfolio",
    "Use 'xdg-open projects' to jump to a site section",
  ];
}

export function getLastLoginLine(): string {
  const loginTime = new Date().toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });

  return `Last login: ${loginTime}`;
}

export function getMotdLines(content: PortfolioContent, lastLoginLine?: string): string[] {
  const lines = [`Linux portfolio-shell 1.0 (${content.profile.handle})`];

  if (lastLoginLine) {
    lines.push(lastLoginLine);
  }

  lines.push(
    "",
    "Type 'help' or 'ls' to explore ~/portfolio",
    "Use 'xdg-open projects' to jump to a site section",
  );

  return lines;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[—–]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function buildVirtualFsForCompletion(content: PortfolioContent): FsDir {
  return buildVirtualFs(content);
}

export function applyTerminalSideEffects(effects: SideEffect[]): void {
  for (const effect of effects) {
    if (effect.type === "scrollTo") {
      document.getElementById(effect.id)?.scrollIntoView({ behavior: "smooth" });
    } else if (effect.type === "openUrl") {
      window.open(effect.url, "_blank", "noopener,noreferrer");
    }
  }
}

function buildVirtualFs(content: PortfolioContent): FsDir {
  const projectDirs: Record<string, FsNode> = {};
  for (const p of content.projects.filter((proj) => !proj.hidden)) {
    const slug = slugify(p.title);
    const links = [
      p.github ? `github: ${p.github}` : "",
      p.demo ? `demo: ${p.demo}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    projectDirs[slug] = {
      type: "dir",
      children: {
        README: {
          type: "file",
          content: [
            p.title,
            "",
            p.description,
            "",
            "Features:",
            ...p.features.map((f) => `- ${f}`),
          ].join("\n"),
        },
        "stack.txt": { type: "file", content: p.stack.join(", ") },
        ...(links ? { "link.txt": { type: "file", content: links } } : {}),
      },
    };
  }

  const skillFiles: Record<string, FsNode> = {};
  for (const s of content.skills) {
    skillFiles[`${slugify(s.category)}.txt`] = {
      type: "file",
      content: `${s.category}\n${s.items.join(", ")}`,
    };
  }

  const expFiles: Record<string, FsNode> = {};
  for (const e of content.experience) {
    expFiles[`${slugify(`${e.role}-${e.company}`)}.txt`] = {
      type: "file",
      content: [
        `${e.role} @ ${e.company}`,
        e.duration,
        "",
        ...e.points.map((pt) => `- ${pt}`),
      ].join("\n"),
    };
  }

  const { profile, about } = content;

  return {
    type: "dir",
    children: {
      about: {
        type: "dir",
        children: {
          README: {
            type: "file",
            content: about || profile.intro,
          },
        },
      },
      skills: { type: "dir", children: skillFiles },
      projects: { type: "dir", children: projectDirs },
      experience: { type: "dir", children: expFiles },
      contact: {
        type: "dir",
        children: {
          "email.txt": { type: "file", content: profile.email },
          "github.txt": { type: "file", content: profile.socials.github },
          "linkedin.txt": { type: "file", content: profile.socials.linkedin },
        },
      },
      README: {
        type: "file",
        content: [
          `Portfolio of ${profile.name}`,
          profile.headline,
          "",
          "Run 'ls' to explore directories.",
          "Run 'xdg-open <section>' to jump to a site section.",
        ].join("\n"),
      },
      "resume.pdf": { type: "file", content: "__RESUME_BINARY__" },
    },
  };
}

function normalizePathSegment(segment: string): string {
  return segment.replace(/\/+$/, "");
}

function resolvePath(cwd: string, rawPath: string): string | null {
  let path = rawPath.trim();
  if (!path || path === "~") return HOME_PATH;
  if (path.startsWith("~/")) path = `${HOME_PATH}/${path.slice(2)}`;
  else if (path.startsWith("~")) path = HOME_PATH;
  else if (!path.startsWith("/")) {
    path = `${cwd}/${path}`;
  }

  const parts = path.split("/").filter(Boolean);
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      if (resolved.length === 0) return null;
      resolved.pop();
    } else {
      resolved.push(normalizePathSegment(part));
    }
  }
  return `/${resolved.join("/")}`;
}

function getNode(fs: FsDir, absPath: string): FsNode | null {
  if (absPath === HOME_PATH || absPath === "/home/portfolio") {
    return fs;
  }
  if (!absPath.startsWith(`${HOME_PATH}/`)) return null;

  const rel = absPath.slice(HOME_PATH.length + 1);
  const segments = rel.split("/").filter(Boolean);
  let current: FsNode = fs;

  for (const segment of segments) {
    if (current.type !== "dir") return null;
    const next = current.children[segment];
    if (!next) return null;
    current = next;
  }
  return current;
}

function listEntries(node: FsDir, longFormat: boolean): string[] {
  const names = Object.keys(node.children).sort();
  if (!longFormat) {
    const dirs = names.filter((n) => node.children[n].type === "dir").map((n) => `${n}/`);
    const files = names.filter((n) => node.children[n].type === "file");
    return [dirs.concat(files).join("  ")];
  }

  return names.map((name) => {
    const child = node.children[name];
    const isDir = child.type === "dir";
    const perms = isDir ? "drwxr-xr-x" : "-rw-r--r--";
    const size = isDir ? "4096" : String(child.content.length).padStart(4, " ");
    const label = isDir ? `${name}/` : name;
    return `${perms}  1 portfolio  portfolio  ${size}  ${label}`;
  });
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuote) {
      if (ch === quoteChar) inQuote = false;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current) tokens.push(current);
  return tokens;
}

function appendHistory(state: ShellState, cmd: string): ShellState {
  const trimmed = cmd.trim();
  if (!trimmed) return state;
  const last = state.history[state.history.length - 1];
  if (last === trimmed) return state;
  return { ...state, history: [...state.history, trimmed] };
}

function result(
  output: string[],
  state: ShellState,
  effects: SideEffect[] = [],
  clear?: boolean,
): CommandResult {
  return { output, state, effects, clear };
}

function handleXdgOpen(
  target: string,
  content: PortfolioContent,
): { output: string[]; effects: SideEffect[] } {
  const normalized = target.replace(/\.pdf$/i, "").replace(/^#/, "").toLowerCase();

  if (target.toLowerCase() === "resume.pdf" || normalized === "resume.pdf") {
    return {
      output: ["Opening resume.pdf in a new tab..."],
      effects: [{ type: "openUrl", url: resolveResumeUrl(content.resumeUrl) }],
    };
  }

  if (normalized === "resume") {
    return {
      output: ["Opening resume section..."],
      effects: [
        { type: "scrollTo", id: "resume" },
        { type: "openUrl", url: resolveResumeUrl(content.resumeUrl) },
      ],
    };
  }

  if (XDG_OPEN_SECTIONS.includes(normalized as (typeof XDG_OPEN_SECTIONS)[number])) {
    return {
      output: [`Opening ${normalized} section in browser...`],
      effects: [{ type: "scrollTo", id: normalized }],
    };
  }

  return {
    output: [
      `xdg-open: no section '${target}'. Try: ${XDG_OPEN_SECTIONS.join(", ")}, resume.pdf`,
    ],
    effects: [],
  };
}

export function runShellCommand(
  cmd: string,
  state: ShellState,
  content: PortfolioContent,
): CommandResult {
  const trimmed = cmd.trim();
  if (!trimmed) return result([], state);

  const ctx: VirtualFsContext = { fs: buildVirtualFs(content), content };
  const nextState = appendHistory(state, trimmed);
  const tokens = tokenize(trimmed);
  const command = tokens[0]?.toLowerCase() ?? "";
  const args = tokens.slice(1);

  if (command === "help" || command === "?") {
    return result(TERMINAL_HELP, nextState);
  }

  if (command === "clear") {
    return result([], nextState, [], true);
  }

  if (command === "pwd") {
    return result([formatDisplayPath(state.cwd)], nextState);
  }

  if (command === "whoami") {
    const { profile } = content;
    return result(
      [
        `${profile.name} — ${profile.role}`,
        profile.headline,
        `location: ${profile.location}`,
      ],
      nextState,
    );
  }

  if (command === "echo") {
    return result([args.join(" ")], nextState);
  }

  if (command === "history") {
    if (nextState.history.length === 0) return result([], nextState);
    return result(
      nextState.history.map((h, i) => `  ${i + 1}  ${h}`),
      nextState,
    );
  }

  if (command === "sudo" && args[0]?.toLowerCase() === "hire-me") {
    const { profile } = content;
    return result(
      [
        "[sudo] authenticating recruiter...",
        "✓ access granted.",
        "",
        "Contact:",
        `  email:    ${profile.email}`,
        `  github:   ${profile.socials.github}`,
        `  linkedin: ${profile.socials.linkedin}`,
        "",
        "Tip: xdg-open contact — jump to the contact section",
      ],
      nextState,
    );
  }

  if (command === "hire-me") {
    return result(["hire-me: try 'sudo hire-me'"], nextState);
  }

  if (command === "xdg-open") {
    if (!args[0]) {
      return result(["xdg-open: missing target"], nextState);
    }
    const { output, effects } = handleXdgOpen(args[0], content);
    return result(output, nextState, effects);
  }

  if (command === "resume") {
    const { output, effects } = handleXdgOpen("resume.pdf", content);
    return result(
      ["resume: deprecated — use 'xdg-open resume.pdf'", ...output],
      nextState,
      effects,
    );
  }

  // Legacy shortcuts — redirect users to authentic commands
  const legacyMap: Record<string, string> = {
    projects: "ls projects/",
    skills: "ls skills/",
    experience: "ls experience/",
    contact: "ls contact/ or xdg-open contact",
  };
  if (legacyMap[command]) {
    return result([`${command}: try '${legacyMap[command]}'`], nextState);
  }

  if (command === "cd") {
    const target = args.join(" ") || "~";
    const resolved = resolvePath(state.cwd, target);
    if (!resolved) {
      return result([`cd: no such file or directory: ${target}`], nextState);
    }
    const node = getNode(ctx.fs, resolved);
    if (!node) {
      return result([`cd: no such file or directory: ${target}`], nextState);
    }
    if (node.type !== "dir") {
      return result([`cd: not a directory: ${target}`], nextState);
    }
    return result([], { ...nextState, cwd: resolved });
  }

  if (command === "ls") {
    let longFormat = false;
    let pathArg = state.cwd;
    for (const arg of args) {
      if (arg === "-l" || arg === "-la" || arg === "-al") longFormat = true;
      else pathArg = arg;
    }
    const resolved = resolvePath(state.cwd, pathArg);
    if (!resolved) {
      return result([`ls: cannot access '${pathArg}': No such file or directory`], nextState);
    }
    const node = getNode(ctx.fs, resolved);
    if (!node) {
      return result([`ls: cannot access '${pathArg}': No such file or directory`], nextState);
    }
    if (node.type === "file") {
      return result([pathArg.split("/").pop() ?? pathArg], nextState);
    }
    return result(listEntries(node, longFormat), nextState);
  }

  if (command === "cat") {
    if (!args[0]) {
      return result(["cat: missing operand"], nextState);
    }
    const filePath = args.join(" ");
    const resolved = resolvePath(state.cwd, filePath);
    if (!resolved) {
      return result([`cat: ${filePath}: No such file or directory`], nextState);
    }
    const node = getNode(ctx.fs, resolved);
    if (!node) {
      return result([`cat: ${filePath}: No such file or directory`], nextState);
    }
    if (node.type === "dir") {
      return result([`cat: ${filePath}: Is a directory`], nextState);
    }
    if (node.content === "__RESUME_BINARY__") {
      return result([`cat: ${filePath}: binary file — try: xdg-open resume.pdf`], nextState);
    }
    return result(node.content.split("\n"), nextState);
  }

  return result([`${command}: command not found. Try 'help'`], nextState);
}
