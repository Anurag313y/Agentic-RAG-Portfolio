import { Download, ExternalLink, FileText } from "lucide-react";

import { usePortfolio } from "@/context/portfolio";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { SectionHeading } from "./SectionHeading";

export function Resume() {
  const { profile, resumeUrl } = usePortfolio();

  return (
    <section id="resume" className="py-12 sm:py-16 md:py-20">
      <div className="section-container">
        <SectionHeading
          id="resume"
          eyebrow="// resume"
          title="Resume"
          description="Skim the highlights or download the full PDF."
        />
        <div className="glass rounded-2xl p-4 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="size-14 rounded-xl bg-cyan/10 border border-cyan/30 text-cyan grid place-items-center">
              <FileText className="size-7" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-base sm:text-lg break-words">
                {profile.name} — Resume.pdf
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground font-mono">
                last updated · 2026 · 1 page
              </div>
            </div>
          </div>
          <div className="flex flex-col xs:flex-row flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
            <Dialog>
              <DialogTrigger asChild>
                <button className="inline-flex w-full xs:w-auto items-center justify-center gap-2 px-5 py-3 min-h-11 rounded-lg bg-cyan text-primary-foreground font-medium hover:bg-cyan-glow transition-colors glow-cyan">
                  <ExternalLink className="size-4" /> View Resume
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl w-[min(95vw,56rem)] h-[min(85dvh,90vh)] p-0 overflow-hidden bg-background border-cyan/30">
                <DialogHeader className="px-4 py-3 border-b border-border/60 shrink-0">
                  <DialogTitle className="font-mono text-sm">resume.pdf</DialogTitle>
                </DialogHeader>
                <object
                  data={resumeUrl}
                  type="application/pdf"
                  className="w-full h-[calc(min(85dvh,90vh)-3.25rem)] min-h-[200px]"
                >
                  <div className="p-6 text-center text-muted-foreground">
                    Your browser can't preview PDFs.{" "}
                    <a className="text-cyan underline" href={resumeUrl} target="_blank" rel="noopener noreferrer">
                      Open the resume
                    </a>
                    .
                  </div>
                </object>
              </DialogContent>
            </Dialog>
            <a
              href={resumeUrl}
              download
              className="inline-flex w-full xs:w-auto items-center justify-center gap-2 px-5 py-3 min-h-11 rounded-lg glass glass-hover font-medium"
            >
              <Download className="size-4" /> Download
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
