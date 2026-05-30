import type { JarvisAction } from "./content.types";
import type { PortfolioContent } from "./content.types";

export function applyJarvisActions(
  actions: JarvisAction | undefined,
  resumeUrl: PortfolioContent["resumeUrl"],
): void {
  if (!actions) return;
  if (actions.scrollTo) {
    document.getElementById(actions.scrollTo)?.scrollIntoView({ behavior: "smooth" });
  }
  if (actions.openResume) {
    window.open(resumeUrl, "_blank", "noopener,noreferrer");
  }
}
