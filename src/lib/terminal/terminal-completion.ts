import type { PortfolioContent } from "@/lib/content.types";
import { buildVirtualFsForCompletion } from "./terminal-shell";
import { getTerminalNode, resolveTerminalPath } from "./terminal-fs-utils";

const COMMANDS = [
  "help",
  "pwd",
  "cd",
  "ls",
  "cat",
  "whoami",
  "echo",
  "clear",
  "history",
  "xdg-open",
  "sudo",
];

const XDG_TARGETS = [
  "about",
  "skills",
  "projects",
  "experience",
  "contact",
  "resume",
  "resume.pdf",
];

function splitInput(input: string): { prefix: string; partial: string; tokens: string[] } {
  const trimmed = input.trimStart();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace === -1) {
    return { prefix: "", partial: trimmed, tokens: trimmed ? [trimmed] : [] };
  }
  return {
    prefix: trimmed.slice(0, lastSpace + 1),
    partial: trimmed.slice(lastSpace + 1),
    tokens: trimmed.split(/\s+/),
  };
}

function completeFromCandidates(partial: string, candidates: string[]): string | null {
  const lower = partial.toLowerCase();
  const matches = candidates.filter(
    (c) => c.toLowerCase().startsWith(lower) && c.toLowerCase() !== lower,
  );
  if (matches.length === 1) return matches[0];
  return null;
}

function listPathEntries(cwd: string, pathPartial: string, content: PortfolioContent): string[] {
  const fs = buildVirtualFsForCompletion(content);
  const dirPart = pathPartial.includes("/")
    ? pathPartial.slice(0, pathPartial.lastIndexOf("/") + 1)
    : "";
  const namePart = pathPartial.includes("/")
    ? pathPartial.slice(pathPartial.lastIndexOf("/") + 1)
    : pathPartial;

  const base = dirPart ? resolveTerminalPath(cwd, dirPart) : cwd;
  if (!base) return [];

  const node = getTerminalNode(fs, base);
  if (!node || node.type !== "dir") return [];

  return Object.keys(node.children)
    .filter((name) => name.toLowerCase().startsWith(namePart.toLowerCase()))
    .map((name) => {
      const suffix = node.children[name].type === "dir" ? "/" : "";
      return `${dirPart}${name}${suffix}`;
    });
}

export function getTabCompletion(
  input: string,
  cwd: string,
  content: PortfolioContent,
): string | null {
  if (!input.trim()) return null;

  const { prefix, partial, tokens } = splitInput(input);
  const cmd = tokens[0]?.toLowerCase() ?? "";

  if (tokens.length === 1 && !input.endsWith(" ")) {
    const completed = completeFromCandidates(partial, COMMANDS);
    return completed ? prefix + completed : null;
  }

  if (cmd === "sudo" && tokens.length === 2 && !input.endsWith(" ")) {
    const completed = completeFromCandidates(partial, ["hire-me"]);
    return completed ? prefix + completed : null;
  }

  if (cmd === "xdg-open" && tokens.length >= 2) {
    const completed = completeFromCandidates(partial, XDG_TARGETS);
    return completed ? prefix + completed : null;
  }

  if ((cmd === "cd" || cmd === "ls" || cmd === "cat") && tokens.length >= 2) {
    const pathCandidates = listPathEntries(cwd, partial, content);
    const completed = completeFromCandidates(partial, pathCandidates);
    return completed ? prefix + completed : null;
  }

  return null;
}
