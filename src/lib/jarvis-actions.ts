import type { JarvisAction, PortfolioContent } from "./content.types";
import { resolveResumeUrl } from "./resume";

export function applyJarvisActions(
  actions: JarvisAction | undefined,
  resumeUrl: PortfolioContent["resumeUrl"],
): void {
  if (!actions) return;
  if (actions.openResume) {
    window.open(resolveResumeUrl(resumeUrl), "_blank", "noopener,noreferrer");
  }
}
