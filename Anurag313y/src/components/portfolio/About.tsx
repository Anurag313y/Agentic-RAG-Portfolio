import { motion } from "framer-motion";
import { Code2, Cpu, Gauge, Shield } from "lucide-react";

import { usePortfolio } from "@/context/portfolio";

import { SectionHeading } from "./SectionHeading";

const PILLARS = [
  { icon: Gauge, title: "Performance", text: "Sub-100ms interactions, profiled, measured, optimized." },
  { icon: Shield, title: "Reliability", text: "Tests, observability, and graceful failure paths by default." },
  { icon: Code2, title: "Craft", text: "Clean architecture, readable code, durable abstractions." },
  { icon: Cpu, title: "Systems", text: "Comfortable from Linux internals up to product UI." },
];

const PHOTO_FALLBACK =
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80";

export function About() {
  const { profile } = usePortfolio();
  const photoSrc = profile.photoUrl || PHOTO_FALLBACK;

  return (
    <section id="about" className="py-12 sm:py-16 md:py-20">
      <div className="section-container">
        <SectionHeading
          id="about"
          eyebrow="// about"
          title="The Engineer Behind the Terminal"
          description="I'm Anurag — a software engineer who treats every product like a system. I care about the boring details that compound: caches that hit, queries that scan small, builds that don't flake, and UIs that don't lie about their state."
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-[minmax(0,220px)_1.1fr_1.3fr] gap-6 sm:gap-8 items-start">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-2xl p-3 sm:p-4 relative overflow-hidden group border border-cyan/20"
          >
            <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.08] z-10" />
            <div className="absolute inset-0 bg-gradient-to-t from-cyan/15 via-transparent to-transparent pointer-events-none z-10 opacity-70 group-hover:opacity-90 transition-opacity" />

            <div className="absolute top-2 left-2 size-2.5 border-t border-l border-cyan/60 z-20" />
            <div className="absolute top-2 right-2 size-2.5 border-t border-r border-cyan/60 z-20" />
            <div className="absolute bottom-2 left-2 size-2.5 border-b border-l border-cyan/60 z-20" />
            <div className="absolute bottom-2 right-2 size-2.5 border-b border-r border-cyan/60 z-20" />

            {/* Mobile: compact row — small avatar + identity */}
            <div className="relative z-[1] flex flex-row items-center gap-3 sm:gap-4 md:flex-col md:items-stretch">
              <div className="relative shrink-0 size-[72px] sm:size-20 md:size-auto md:w-full rounded-xl overflow-hidden bg-background/40 border border-border/40 md:aspect-square">
                <img
                  src={photoSrc}
                  alt={profile.name}
                  width={160}
                  height={160}
                  className="w-full h-full object-cover object-top grayscale contrast-125 brightness-95 group-hover:grayscale-0 md:group-hover:scale-105 transition-all duration-700"
                  onError={(e) => {
                    e.currentTarget.src = PHOTO_FALLBACK;
                  }}
                />
              </div>

              <div className="flex-1 min-w-0 md:hidden">
                <p className="font-semibold text-sm leading-tight truncate">{profile.name}</p>
                <p className="text-xs text-cyan mt-0.5 truncate">{profile.role}</p>
                <p className="font-mono text-[10px] text-muted-foreground mt-1 truncate">
                  {profile.location}
                </p>
              </div>
            </div>

            <div className="relative z-[1] mt-2 sm:mt-3 flex justify-between items-center gap-2 font-mono text-[9px] sm:text-[10px] text-muted-foreground/80 px-0.5 min-w-0">
              <span className="truncate">
                SYS.IMG // {profile.name.toUpperCase().replace(/\s+/g, "_")}
              </span>
              <span className="text-cyan animate-pulse shrink-0">● ONLINE</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="glass rounded-2xl p-4 sm:p-6 font-mono text-xs sm:text-sm space-y-2 sm:space-y-3 h-full flex flex-col justify-center min-w-0"
          >
            <div>
              <span className="text-emerald">const</span>{" "}
              <span className="text-cyan">engineer</span> = {"{"}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4 md:col-span-2 lg:col-span-1">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                className="glass glass-hover rounded-xl p-3 sm:p-4 flex gap-3 sm:gap-4 items-start min-w-0"
              >
                <div className="size-9 rounded-lg bg-cyan/10 border border-cyan/30 text-cyan grid place-items-center shrink-0">
                  <p.icon className="size-4.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm">{p.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{p.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
