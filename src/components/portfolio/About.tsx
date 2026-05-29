import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SectionHeading } from "./SectionHeading";
import { Code2, Cpu, Gauge, Shield } from "lucide-react";
import { loadContent } from "@/lib/admin-store";
import { PROFILE } from "@/lib/portfolio-data";

const PILLARS = [
  { icon: Gauge, title: "Performance", text: "Sub-100ms interactions, profiled, measured, optimized." },
  { icon: Shield, title: "Reliability", text: "Tests, observability, and graceful failure paths by default." },
  { icon: Code2, title: "Craft", text: "Clean architecture, readable code, durable abstractions." },
  { icon: Cpu, title: "Systems", text: "Comfortable from Linux internals up to product UI." },
];

export function About() {
  const [profile, setProfile] = useState(PROFILE);

  useEffect(() => {
    const content = loadContent();
    if (content?.profile) {
      setProfile(content.profile);
    }
  }, []);

  return (
    <section id="about" className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <SectionHeading
          id="about"
          eyebrow="// about"
          title="The Engineer Behind the Terminal"
          description="I'm Anurag — a software engineer who treats every product like a system. I care about the boring details that compound: caches that hit, queries that scan small, builds that don't flake, and UIs that don't lie about their state."
        />

        <div className="grid lg:grid-cols-[1fr_1.1fr_1.3fr] gap-8 items-start">
          {/* Column 1: Professional Holographic Profile Photo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-2xl p-4 relative overflow-hidden group border border-cyan/20"
          >
            {/* Scanlines layer */}
            <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.08] z-10" />
            <div className="absolute inset-0 bg-gradient-to-t from-cyan/15 via-transparent to-transparent pointer-events-none z-10 opacity-70 group-hover:opacity-90 transition-opacity" />
            
            {/* Hologram/terminal corners */}
            <div className="absolute top-2 left-2 size-2.5 border-t border-l border-cyan/60" />
            <div className="absolute top-2 right-2 size-2.5 border-t border-r border-cyan/60" />
            <div className="absolute bottom-2 left-2 size-2.5 border-b border-l border-cyan/60" />
            <div className="absolute bottom-2 right-2 size-2.5 border-b border-r border-cyan/60" />

            <div className="relative aspect-square rounded-xl overflow-hidden bg-background/40 border border-border/40">
              <img
                src={profile.photoUrl || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80"}
                alt={profile.name}
                className="w-full h-full object-cover grayscale contrast-125 brightness-95 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80";
                }}
              />
            </div>

            {/* Hologram metadata footer */}
            <div className="mt-3 flex justify-between items-center font-mono text-[9px] text-muted-foreground/80 px-1">
              <span>SYS.IMG // {profile.name.toUpperCase().replace(/\s+/g, "_")}</span>
              <span className="text-cyan animate-pulse">● ONLINE</span>
            </div>
          </motion.div>

          {/* Column 2: JSON Code block */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="glass rounded-2xl p-6 font-mono text-sm space-y-3 h-full flex flex-col justify-center"
          >
            <div>
              <span className="text-emerald">const</span>{" "}
              <span className="text-cyan">engineer</span> = {"{"}
            </div>
            <div className="pl-4">
              <span className="text-muted-foreground">name:</span>{" "}
              <span className="text-foreground">"{profile.name}"</span>,
            </div>
            <div className="pl-4">
              <span className="text-muted-foreground">role:</span>{" "}
              <span className="text-foreground">"{profile.role}"</span>,
            </div>
            <div className="pl-4">
              <span className="text-muted-foreground">focus:</span>{" "}
              <span className="text-foreground">"reliable systems & beautiful UX"</span>,
            </div>
            <div className="pl-4">
              <span className="text-muted-foreground">location:</span>{" "}
              <span className="text-foreground">"{profile.location}"</span>,
            </div>
            <div className="pl-4">
              <span className="text-muted-foreground">currently:</span>{" "}
              <span className="text-emerald">"open to senior roles"</span>,
            </div>
            <div>{"};"}</div>
          </motion.div>

          {/* Column 3: Pillars */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-4">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                className="glass glass-hover rounded-xl p-4 flex gap-4 items-start"
              >
                <div className="size-9 rounded-lg bg-cyan/10 border border-cyan/30 text-cyan grid place-items-center shrink-0">
                  <p.icon className="size-4.5" />
                </div>
                <div>
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