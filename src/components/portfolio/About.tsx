import { motion } from "framer-motion";
import { Code2, Cpu, Gauge, Shield } from "lucide-react";

import { resolveMediaUrl } from "@/lib/media";

import { usePortfolio } from "@/context/portfolio";

import { SectionHeading } from "./SectionHeading";

const PILLARS = [
  {
    icon: Gauge,
    title: "Performance",
    text: "Sub-100ms interactions, profiled, measured, optimized.",
    short: "Fast interactions, profiled & optimized.",
  },
  {
    icon: Shield,
    title: "Reliability",
    text: "Tests, observability, and graceful failure paths by default.",
    short: "Tests, observability, graceful failures.",
  },
  {
    icon: Code2,
    title: "Craft",
    text: "Clean architecture, readable code, durable abstractions.",
    short: "Clean architecture & readable code.",
  },
  {
    icon: Cpu,
    title: "Systems",
    text: "Comfortable from Linux internals up to product UI.",
    short: "Linux internals to product UI.",
  },
];

const PHOTO_FALLBACK =
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80";

function PhotoCard({ photoSrc, profile }: { photoSrc: string; profile: ReturnType<typeof usePortfolio>["profile"] }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass rounded-2xl p-3 sm:p-4 relative overflow-hidden group border border-cyan/20 h-full"
    >
      <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.08] z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-cyan/15 via-transparent to-transparent pointer-events-none z-10 opacity-70 group-hover:opacity-90 transition-opacity" />
      <div className="absolute top-2 left-2 size-2.5 border-t border-l border-cyan/60 z-20" />
      <div className="absolute top-2 right-2 size-2.5 border-t border-r border-cyan/60 z-20" />
      <div className="absolute bottom-2 left-2 size-2.5 border-b border-l border-cyan/60 z-20" />
      <div className="absolute bottom-2 right-2 size-2.5 border-b border-r border-cyan/60 z-20" />

      <div className="relative z-[1] flex flex-row items-center gap-3 sm:gap-4 lg:flex-col lg:items-stretch">
        <div className="relative shrink-0 size-[72px] sm:size-20 lg:size-auto lg:w-full rounded-xl overflow-hidden bg-background/40 border border-border/40 lg:aspect-square">
          <img
            src={photoSrc}
            alt={profile.name}
            width={200}
            height={200}
            className="w-full h-full object-cover object-top grayscale contrast-125 brightness-95 group-hover:grayscale-0 lg:group-hover:scale-105 transition-all duration-700"
            onError={(e) => {
              e.currentTarget.src = PHOTO_FALLBACK;
            }}
          />
        </div>
        <div className="flex-1 min-w-0 lg:hidden">
          <p className="font-semibold text-sm leading-tight truncate">{profile.name}</p>
          <p className="text-xs text-cyan mt-0.5 truncate">{profile.role}</p>
          <p className="font-mono text-[10px] text-muted-foreground mt-1 truncate">{profile.location}</p>
        </div>
      </div>

      <div className="relative z-[1] mt-2 sm:mt-3 lg:mt-3 flex justify-between items-center gap-2 font-mono text-[9px] sm:text-[10px] text-muted-foreground/80 px-0.5 min-w-0">
        <span className="truncate">SYS.IMG // {profile.name.toUpperCase().replace(/\s+/g, "_")}</span>
        <span className="text-cyan animate-pulse shrink-0">● ONLINE</span>
      </div>
    </motion.div>
  );
}

function CodeCard({ profile }: { profile: ReturnType<typeof usePortfolio>["profile"] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className="glass rounded-xl sm:rounded-2xl p-3.5 sm:p-5 lg:p-6 font-mono text-[11px] sm:text-sm space-y-1 sm:space-y-2 h-full min-h-full flex flex-1 flex-col justify-center min-w-0 w-full md:w-fit md:max-w-full"
    >
      <div>
        <span className="text-emerald">const</span> <span className="text-cyan">engineer</span> = {"{"}
      </div>
      <div className="pl-3 sm:pl-4 break-words">
        <span className="text-muted-foreground">name:</span>{" "}
        <span className="text-foreground">"{profile.name}"</span>,
      </div>
      <div className="pl-3 sm:pl-4 break-words">
        <span className="text-muted-foreground">role:</span>{" "}
        <span className="text-foreground">"{profile.role}"</span>,
      </div>
      <div className="pl-3 sm:pl-4 break-words">
        <span className="text-muted-foreground">focus:</span>{" "}
        <span className="text-foreground">"reliable systems & beautiful UX"</span>,
      </div>
      <div className="pl-3 sm:pl-4 break-words">
        <span className="text-muted-foreground">location:</span>{" "}
        <span className="text-foreground">"{profile.location}"</span>,
      </div>
      <div className="pl-3 sm:pl-4 break-words">
        <span className="text-muted-foreground">currently:</span>{" "}
        <span className="text-emerald">"open to senior roles"</span>,
      </div>
      <div>{"};"}</div>
    </motion.div>
  );
}

export function About() {
  const { profile } = usePortfolio();
  const photoSrc = resolveMediaUrl(profile.photoUrl) || PHOTO_FALLBACK;

  return (
    <section id="about" className="section-py scroll-mt-24">
      <div className="section-container">
        <SectionHeading
          id="about"
          eyebrow="// about"
          title="The Engineer Behind the Terminal"
          description="I'm Anurag — a software engineer who treats every product like a system. I care about the boring details that compound: caches that hit, queries that scan small, builds that don't flake, and UIs that don't lie about their state."
        />

        <div className="flex flex-col gap-3 sm:gap-5 lg:gap-6">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(200px,260px)_auto] gap-3 sm:gap-5 lg:gap-6 items-stretch w-full md:w-fit md:max-w-full">
            <PhotoCard photoSrc={photoSrc} profile={profile} />
            <div className="flex min-h-0 h-full">
              <CodeCard profile={profile} />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                className="glass glass-hover rounded-lg sm:rounded-xl p-2.5 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-start min-w-0 h-full"
              >
                <div className="size-8 sm:size-10 rounded-md sm:rounded-lg bg-cyan/10 border border-cyan/30 text-cyan grid place-items-center shrink-0">
                  <p.icon className="size-3.5 sm:size-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-xs sm:text-base leading-tight">{p.title}</h3>
                  <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 leading-snug sm:leading-relaxed">
                    <span className="sm:hidden">{p.short}</span>
                    <span className="hidden sm:inline">{p.text}</span>
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
