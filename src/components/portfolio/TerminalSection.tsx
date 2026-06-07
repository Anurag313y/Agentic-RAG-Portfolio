import { SectionHeading } from "./SectionHeading";
import { EXPERIENCE, PROFILE, PROJECTS, SKILLS } from "@/lib/portfolio-data";
import type { PortfolioContent } from "@/lib/content.types";
import { PortfolioTerminal } from "./PortfolioTerminal";

const STATIC_CONTENT: PortfolioContent = {
  profile: PROFILE,
  skills: SKILLS,
  projects: PROJECTS,
  experience: EXPERIENCE,
  about: PROFILE.intro,
  resumeUrl: PROFILE.resumeUrl,
};

export function TerminalSection() {
  return (
    <section id="terminal" className="py-12 sm:py-16 relative">
      <div className="section-container">
        <SectionHeading
          id="terminal"
          eyebrow="// developer console"
          title="Linux Command Line"
          description="A live shell wired to my portfolio. Prefer keys over clicks? Type a command or pick a chip."
        />

        <PortfolioTerminal
          content={STATIC_CONTENT}
          variant="section"
          enableExpand
          screenClassName="h-[min(340px,50dvh)] sm:h-[420px]"
        />
      </div>
    </section>
  );
}
