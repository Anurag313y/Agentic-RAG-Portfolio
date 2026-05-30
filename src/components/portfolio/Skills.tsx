import { motion } from "framer-motion";
import {
  Cloud,
  Code,
  Database,
  Layers,
  Server,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { usePortfolio } from "@/context/portfolio";
import type { PortfolioContent } from "@/lib/content.types";

import { SectionHeading } from "./SectionHeading";

type SkillCategory = PortfolioContent["skills"][number];

const ICONS: Record<string, LucideIcon> = {
  Frontend: Layers,
  Backend: Server,
  Databases: Database,
  "DevOps / Tools": Wrench,
  Languages: Code,
  Cloud: Cloud,
};

const TAG_CLASS =
  "font-mono text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-1 sm:py-2 min-h-7 sm:min-h-9 inline-flex items-center rounded-md bg-secondary/60 border border-border text-foreground/85 transition-colors";

const MORE_TAG_CLASS = `${TAG_CLASS} cursor-pointer hover:border-cyan/40 hover:text-cyan focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan/50`;

function SkillTag({ label }: { label: string }) {
  return <span className={TAG_CLASS}>{label}</span>;
}

function useVisibleSkillCount(items: string[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(items.length);

  const remeasure = useCallback(() => {
    const container = containerRef.current;
    const probe = probeRef.current;
    if (!container || !probe) return;

    probe.style.width = `${container.clientWidth}px`;
    const maxHeight = container.clientHeight;
    if (maxHeight <= 0) return;

    let next = items.length;

    for (let n = items.length; n >= 0; n--) {
      const hidden = items.length - n;
      probe.replaceChildren();

      for (const label of items.slice(0, n)) {
        const chip = document.createElement("span");
        chip.className = TAG_CLASS;
        chip.textContent = label;
        probe.appendChild(chip);
      }

      if (hidden > 0) {
        const more = document.createElement("span");
        more.className = MORE_TAG_CLASS;
        more.textContent = `+${hidden} more`;
        probe.appendChild(more);
      }

      if (probe.scrollHeight <= maxHeight + 1) {
        next = n;
        break;
      }
    }

    setVisibleCount((prev) => (prev !== next ? next : prev));
  }, [items]);

  useLayoutEffect(() => {
    remeasure();
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(remeasure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [remeasure]);

  return { containerRef, probeRef, visibleCount };
}

function SkillCategoryCard({
  cat,
  index,
}: {
  cat: SkillCategory;
  index: number;
}) {
  const Icon = ICONS[cat.category] ?? Code;
  const { containerRef, probeRef, visibleCount } = useVisibleSkillCount(cat.items);
  const hiddenCount = cat.items.length - visibleCount;
  const hasMore = hiddenCount > 0;
  const visible = cat.items.slice(0, visibleCount);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      className="glass glass-hover rounded-xl sm:rounded-2xl p-2.5 sm:p-5 lg:p-6 min-w-0"
    >
      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
        <div className="size-8 sm:size-10 rounded-md sm:rounded-lg bg-cyan/10 border border-cyan/30 text-cyan grid place-items-center shrink-0">
          <Icon className="size-4 sm:size-5" />
        </div>
        <h3 className="font-semibold text-xs sm:text-lg leading-tight min-w-0">
          {cat.category}
        </h3>
      </div>

      <div className="relative">
        <div
          ref={probeRef}
          className="absolute left-0 top-0 flex flex-wrap gap-1 sm:gap-2 content-start invisible pointer-events-none"
          aria-hidden
        />
        <div
          ref={containerRef}
          className="h-[5.5rem] sm:h-[6.75rem] overflow-hidden"
        >
          <div className="flex flex-wrap gap-1 sm:gap-2 content-start">
            {visible.map((s) => (
              <SkillTag key={s} label={s} />
            ))}
            {hasMore && (
              <Dialog>
                <DialogTrigger asChild>
                  <button type="button" className={MORE_TAG_CLASS}>
                    +{hiddenCount} more
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md w-[min(92vw,28rem)] bg-background border-cyan/30">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2.5 font-semibold text-base">
                      <span className="size-9 rounded-lg bg-cyan/10 border border-cyan/30 text-cyan grid place-items-center shrink-0">
                        <Icon className="size-4" />
                      </span>
                      {cat.category}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-wrap gap-2 max-h-[min(50dvh,20rem)] overflow-y-auto pr-1">
                    {cat.items.map((s) => (
                      <SkillTag key={s} label={s} />
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Skills() {
  const { skills } = usePortfolio();

  return (
    <section id="skills" className="section-py scroll-mt-24 relative">
      <div className="section-container">
        <SectionHeading
          id="skills"
          eyebrow="// stack"
          title="Skills & Tooling"
          description="The tools I reach for daily. Categorized for clarity."
        />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 lg:gap-5">
          {skills.map((cat, i) => (
            <SkillCategoryCard key={cat.category} cat={cat} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
