import type { PortfolioContent } from "@/lib/content.types";

export type SideEffect =
  | { type: "scrollTo"; id: string }
  | { type: "openUrl"; url: string };

export type ShellState = {
  /** Absolute path, e.g. /home/portfolio/projects */
  cwd: string;
  history: string[];
};

export type FsFile = {
  type: "file";
  content: string;
};

export type FsDir = {
  type: "dir";
  children: Record<string, FsNode>;
};

export type FsNode = FsFile | FsDir;

export type CommandResult = {
  output: string[];
  clear?: boolean;
  state: ShellState;
  effects: SideEffect[];
};

export type VirtualFsContext = {
  fs: FsDir;
  content: PortfolioContent;
};

export const HOME_PATH = "/home/portfolio";

export const XDG_OPEN_SECTIONS = [
  "about",
  "skills",
  "projects",
  "experience",
  "contact",
  "resume",
] as const;

export type XdgOpenSection = (typeof XDG_OPEN_SECTIONS)[number];
