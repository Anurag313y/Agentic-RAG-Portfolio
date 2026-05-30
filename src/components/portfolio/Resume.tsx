"use client";

import { usePortfolio } from "@/context/portfolio";

import { ResumeViewer } from "./ResumeViewer";
import { SectionHeading } from "./SectionHeading";

export function Resume() {
  const { profile, resumeUrl } = usePortfolio();

  return (
    <section id="resume" className="section-py scroll-mt-24">
      <div className="section-container">
        <SectionHeading
          id="resume"
          eyebrow="// resume"
          title="Resume"
          description="Skim the highlights or download the full PDF."
        />
        <ResumeViewer profileName={profile.name} resumeUrl={resumeUrl} />
      </div>
    </section>
  );
}
