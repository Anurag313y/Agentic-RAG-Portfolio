export type OutputLineKind =
  | "error"
  | "hint"
  | "success"
  | "ls-short"
  | "ls-long"
  | "help"
  | "motd"
  | "plain";

export function classifyOutputLine(text: string): OutputLineKind {
  if (/^(cd|cat|ls|xdg-open|hire-me):/.test(text)) return "error";
  if (/command not found:/.test(text)) return "error";
  if (/deprecated|try '/.test(text)) return "hint";
  if (text.startsWith("[sudo]") || text.startsWith("✓")) return "success";
  if (/^drwxr-xr-x|^-rw-r--r--/.test(text)) return "ls-long";
  if (text.startsWith("Available commands:")) return "help";
  if (text.startsWith("Linux portfolio-shell")) return "motd";
  if (text.startsWith("Last login:")) return "motd";
  return "plain";
}

export function isLsShortLine(text: string, kind: OutputLineKind): boolean {
  if (kind !== "plain") return false;
  return /\//.test(text) && !text.includes("\n") && text.split(/\s{2,}/).length >= 1;
}
