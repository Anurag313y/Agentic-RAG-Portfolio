import { Download, FileText, ExternalLink } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { PROFILE } from "@/lib/portfolio-data";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader } from "@/components/ui/dialog";

export function Resume() {
  return (
    <section id="resume" className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <SectionHeading
          id="resume"
          eyebrow="// resume"
          title="Resume / CV"
          description="Skim the highlights or download the full PDF."
        />
        <div className="glass rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-xl bg-cyan/10 border border-cyan/30 text-cyan grid place-items-center">
              <FileText className="size-7" />
            </div>
            <div>
              <div className="font-semibold text-lg">{PROFILE.name} — Resume.pdf</div>
              <div className="text-sm text-muted-foreground font-mono">
                last updated · 2026 · 1 page
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan text-primary-foreground font-medium hover:bg-cyan-glow transition-colors glow-cyan">
                  <ExternalLink className="size-4" /> View Resume
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 overflow-hidden bg-background border-cyan/30">
                <DialogHeader className="px-4 py-3 border-b border-border/60">
                  <DialogTitle className="font-mono text-sm">resume.pdf</DialogTitle>
                </DialogHeader>
                <object
                  data={PROFILE.resumeUrl}
                  type="application/pdf"
                  className="w-full h-[calc(85vh-49px)]"
                >
                  <div className="p-6 text-center text-muted-foreground">
                    Your browser can't preview PDFs.{" "}
                    <a className="text-cyan underline" href={PROFILE.resumeUrl} target="_blank" rel="noopener noreferrer">
                      Open the resume
                    </a>
                    .
                  </div>
                </object>
              </DialogContent>
            </Dialog>
            <a
              href={PROFILE.resumeUrl}
              download
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg glass glass-hover font-medium"
            >
              <Download className="size-4" /> Download
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}