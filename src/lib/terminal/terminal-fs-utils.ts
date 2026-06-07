import type { FsDir, FsNode } from "./terminal.types";
import { HOME_PATH } from "./terminal.types";

function normalizePathSegment(segment: string): string {
  return segment.replace(/\/+$/, "");
}

export function resolveTerminalPath(cwd: string, rawPath: string): string | null {
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

export function getTerminalNode(fs: FsDir, absPath: string): FsNode | null {
  if (absPath === HOME_PATH) return fs;
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
