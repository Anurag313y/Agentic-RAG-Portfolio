"use client";

import { motion } from "framer-motion";
import { ExternalLink, Github, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { resolveMediaUrl } from "@/lib/media";
import { usePortfolio } from "@/context/portfolio";

import {
  ProjectDescription,
  ProjectDetailDialog,
  type ProjectItem,
} from "./ProjectDetailDialog";
import { SectionHeading } from "./SectionHeading";

const PROJECT_IMAGE_FALLBACK =
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=400&q=80";

function ProjectCardImage({
  src,
  alt,
  layout = "side",
}: {
  src?: string;
  alt: string;
  layout?: "side" | "banner";
}) {
  const imageSrc = resolveMediaUrl(src) || PROJECT_IMAGE_FALLBACK;

  if (layout === "banner") {
    return (
      <div className="relative w-full overflow-hidden rounded-lg border border-cyan/25 bg-background/50 aspect-[16/10] max-h-[140px] sm:max-h-none sm:aspect-square sm:rounded-xl sm:max-w-full">
        <img
          src={imageSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
          onError={(e) => {
            e.currentTarget.src = PROJECT_IMAGE_FALLBACK;
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/55 via-transparent to-cyan/5" />
        <div className="pointer-events-none absolute top-2 right-2 rounded-md bg-background/80 backdrop-blur-sm p-1 border border-cyan/25">
          <Sparkles className="size-3.5 text-cyan" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full min-h-[100px] sm:min-h-[130px]">
      <div className="relative mx-auto h-full w-full max-w-full aspect-square rounded-xl overflow-hidden border border-cyan/25 bg-background/50 ring-1 ring-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_32px_-12px_rgba(34,211,238,0.45)]">
        <img
          src={imageSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
          onError={(e) => {
            e.currentTarget.src = PROJECT_IMAGE_FALLBACK;
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/55 via-transparent to-cyan/5" />
        <div className="pointer-events-none absolute top-2 right-2 rounded-md bg-background/80 backdrop-blur-sm p-1 border border-cyan/25">
          <Sparkles className="size-3.5 text-cyan" />
        </div>
      </div>
    </div>
  );
}

export function ProjectCard({
  project,
  index,
  onOpenDetail,
}: {
  project: ProjectItem;
  index: number;
  onOpenDetail: () => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      className="glass glass-hover rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 group relative overflow-hidden flex flex-col min-w-0"
    >
      <div className="absolute -top-16 -right-16 size-48 rounded-full bg-cyan/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="flex flex-col gap-2.5 sm:hidden">
        <ProjectCardImage src={project.imageUrl} alt={`${project.title} preview`} layout="banner" />
        <div className="min-w-0 space-y-1.5">
          <div className="font-mono text-[10px] text-cyan tracking-wider uppercase">
            project_{String(index + 1).padStart(2, "0")}
          </div>
          <h3 className="text-base font-semibold tracking-tight leading-tight text-foreground line-clamp-2">
            {project.title}
          </h3>
          <ProjectDescription description={project.description} onSeeMore={onOpenDetail} />
          <div className="flex flex-wrap gap-1">
            {project.stack.slice(0, 3).map((s) => (
              <span
                key={s}
                className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-cyan/35 text-cyan bg-cyan/5"
              >
                {s}
              </span>
            ))}
            {project.stack.length > 3 && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 text-muted-foreground">
                +{project.stack.length - 3}
              </span>
            )}
          </div>
          <ul className="space-y-0.5">
            {project.features.slice(0, 2).map((f) => (
              <li key={f} className="flex items-center gap-1.5 text-[11px] text-foreground/90 min-w-0">
                <span className="size-1 rounded-full bg-emerald shrink-0" />
                <span className="truncate">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(128px,44%)] gap-3 items-stretch flex-1">
        <div className="min-w-0 flex flex-col justify-center gap-1.5 sm:gap-2">
          <div>
            <div className="font-mono text-xs text-cyan tracking-wider uppercase">
              project_{String(index + 1).padStart(2, "0")}
            </div>
            <h3 className="mt-0.5 text-lg sm:text-xl font-semibold tracking-tight leading-tight text-foreground line-clamp-2">
              {project.title}
            </h3>
          </div>

          <ProjectDescription
            description={project.description}
            onSeeMore={onOpenDetail}
            className="sm:[&_p]:text-[15px]"
          />

          <div className="flex flex-wrap gap-1.5">
            {project.stack.map((s) => (
              <span
                key={s}
                className="font-mono text-[11px] sm:text-xs px-2 py-0.5 rounded-md border border-cyan/35 text-cyan bg-cyan/5"
              >
                {s}
              </span>
            ))}
          </div>

          <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
            {project.features.slice(0, 4).map((f) => (
              <li
                key={f}
                className="flex items-center gap-1.5 text-xs sm:text-sm text-foreground/90 min-w-0"
              >
                <span className="size-1.5 rounded-full bg-emerald shrink-0" />
                <span className="truncate">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 h-full">
          <ProjectCardImage src={project.imageUrl} alt={`${project.title} preview`} layout="side" />
        </div>
      </div>

      {(project.github || project.demo) && (
        <div className="mt-2 sm:mt-2.5 flex items-center justify-between gap-3 py-1 sm:py-1.5 border-t border-border/50">
          {project.github ? (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-cyan transition-colors"
            >
              <Github className="size-3.5 sm:size-4 shrink-0" /> Source
            </a>
          ) : (
            <span />
          )}
          {project.demo ? (
            <a
              href={project.demo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-emerald hover:text-emerald/80 transition-colors shrink-0"
            >
              Live demo <ExternalLink className="size-3.5 sm:size-4 shrink-0" />
            </a>
          ) : null}
        </div>
      )}
    </motion.article>
  );
}

export function Projects() {
  const { profile, projects } = usePortfolio();
  const visibleProjects = projects.filter((p) => !p.hidden);
  const displayedProjects = visibleProjects.slice(0, 4);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);

  const detailProject = detailIndex !== null ? visibleProjects[detailIndex] ?? null : null;

  return (
    <section id="projects" className="section-py scroll-mt-24">
      <div className="section-container">
        <SectionHeading
          id="projects"
          eyebrow="// projects"
          title="Projects"
          description="A snapshot of systems I've designed and shipped. Every one of these was built to be maintained."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5 lg:gap-6">
          {displayedProjects.map((p, i) => (
            <ProjectCard
              key={p.title}
              project={p}
              index={i}
              onOpenDetail={() => setDetailIndex(i)}
            />
          ))}
        </div>

        <ProjectDetailDialog
          project={detailProject}
          index={detailIndex ?? 0}
          open={detailIndex !== null}
          onOpenChange={(next) => {
            if (!next) setDetailIndex(null);
          }}
        />

        <div className="mt-8 sm:mt-12 flex justify-center">
          {visibleProjects.length > 4 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Link
                to="/projects"
                className="inline-flex flex-col sm:flex-row flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-5 py-3 rounded-lg border border-cyan/40 hover:border-cyan text-cyan hover:bg-cyan/5 transition-all duration-300 font-mono text-[11px] sm:text-sm group glow-cyan text-center cursor-pointer"
              >
                <span>$ ls /portfolio/projects/archive/</span>
                <span className="text-muted-foreground group-hover:text-cyan/85 transition-colors">
                  (Show all {visibleProjects.length} projects)
                </span>
                <span aria-hidden className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
