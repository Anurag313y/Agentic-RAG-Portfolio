"use client";

import { ExternalLink, Github, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveMediaUrl } from "@/lib/media";
import type { PortfolioContent } from "@/lib/content.types";

const PROJECT_IMAGE_FALLBACK =
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80";

export type ProjectItem = PortfolioContent["projects"][number];

type ProjectDetailDialogProps = {
  project: ProjectItem | null;
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProjectDetailDialog({
  project,
  index,
  open,
  onOpenChange,
}: ProjectDetailDialogProps) {
  if (!project) return null;

  const imageSrc = resolveMediaUrl(project.imageUrl) || PROJECT_IMAGE_FALLBACK;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[min(94vw,40rem)] max-h-[min(90dvh,44rem)] p-0 gap-0 overflow-hidden bg-background border-cyan/30">
        <div className="relative h-36 sm:h-44 shrink-0 overflow-hidden">
          <img
            src={imageSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.src = PROJECT_IMAGE_FALLBACK;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-cyan/10" />
          <div className="absolute top-3 right-3 rounded-md bg-background/85 backdrop-blur-sm p-1.5 border border-cyan/25">
            <Sparkles className="size-4 text-cyan" />
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(min(90dvh,44rem)-9rem)] px-4 sm:px-6 pb-5 sm:pb-6">
          <DialogHeader className="text-left space-y-2 pt-4 sm:pt-5">
            <p className="font-mono text-[10px] sm:text-xs text-cyan tracking-wider uppercase">
              project_{String(index + 1).padStart(2, "0")}
            </p>
            <DialogTitle className="text-xl sm:text-2xl font-semibold leading-tight pr-8">
              {project.title}
            </DialogTitle>
          </DialogHeader>

          <p className="mt-3 text-sm sm:text-[15px] text-muted-foreground leading-relaxed">
            {project.description}
          </p>

          <div className="mt-5">
            <h4 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Stack
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {project.stack.map((s) => (
                <span
                  key={s}
                  className="font-mono text-[11px] sm:text-xs px-2 py-1 rounded-md border border-cyan/35 text-cyan bg-cyan/5"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {project.features.length > 0 && (
            <div className="mt-5">
              <h4 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Highlights
              </h4>
              <ul className="space-y-2">
                {project.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-foreground/90 leading-snug"
                  >
                    <span className="mt-1.5 size-1.5 rounded-full bg-emerald shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(project.github || project.demo) && (
            <div className="mt-6 pt-4 border-t border-border/50 flex flex-wrap gap-3">
              {project.github ? (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border/70 hover:border-cyan/40 text-sm text-muted-foreground hover:text-cyan transition-colors"
                >
                  <Github className="size-4" /> View source
                </a>
              ) : null}
              {project.demo ? (
                <a
                  href={project.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald/10 border border-emerald/40 text-sm text-emerald hover:bg-emerald/15 transition-colors"
                >
                  Live demo <ExternalLink className="size-4" />
                </a>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectDescription({
  description,
  onSeeMore,
  className = "",
}: {
  description: string;
  onSeeMore: () => void;
  className?: string;
}) {
  const needsMore = description.length > 96;

  return (
    <div className={className}>
      <p
        className={`text-xs sm:text-sm text-muted-foreground leading-snug ${needsMore ? "line-clamp-2" : ""}`}
      >
        {description}
      </p>
      {needsMore ? (
        <button
          type="button"
          onClick={onSeeMore}
          className="mt-1.5 font-mono text-[10px] sm:text-xs text-cyan hover:text-cyan-glow transition-colors inline-flex items-center gap-1"
        >
          See more
          <span aria-hidden className="opacity-70">
            →
          </span>
        </button>
      ) : null}
    </div>
  );
}
