import { motion } from "framer-motion";
import { ExternalLink, Github, Sparkles } from "lucide-react";

import { usePortfolio } from "@/context/portfolio";

import { SectionHeading } from "./SectionHeading";

export function Projects() {
  const { profile, projects } = usePortfolio();
  const visibleProjects = projects.filter((p) => !p.hidden);

  return (
    <section id="projects" className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <SectionHeading
          id="projects"
          eyebrow="// projects"
          title="Projects"
          description="A snapshot of systems I've designed and shipped. Every one of these was built to be maintained."
        />
        <div className="grid md:grid-cols-2 gap-6">
          {visibleProjects.map((p, i) => (
            <motion.article
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="glass glass-hover rounded-2xl p-6 group relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="absolute -top-12 -right-12 size-40 rounded-full bg-cyan/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-xs text-cyan mb-2">
                      project_{String(i + 1).padStart(2, "0")}
                    </div>
                    <h3 className="text-xl font-semibold tracking-tight">{p.title}</h3>
                  </div>
                  <Sparkles className="size-5 text-cyan/70 shrink-0" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{p.description}</p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.stack.map((s) => (
                    <span
                      key={s}
                      className="font-mono text-[10px] px-2 py-0.5 rounded border border-cyan/30 text-cyan/90 bg-cyan/5"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <ul className="mt-4 grid sm:grid-cols-2 gap-1.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-foreground/85">
                      <span className="size-1.5 rounded-full bg-emerald" /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 flex items-center gap-3 pt-4 border-t border-border/60">
                {p.github && (
                  <a
                    href={p.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-cyan transition-colors"
                  >
                    <Github className="size-4" /> Source
                  </a>
                )}
                {p.demo && (
                  <a
                    href={p.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-cyan transition-colors"
                  >
                    <ExternalLink className="size-4" /> Live demo
                  </a>
                )}
                <button className="ml-auto font-mono text-xs px-2.5 py-1 rounded-md border border-emerald/30 text-emerald hover:bg-emerald/10 transition-colors">
                  case study →
                </button>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <motion.a
            href={profile.socials.github}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-cyan/40 hover:border-cyan text-cyan hover:bg-cyan/5 transition-all duration-300 font-mono text-xs sm:text-sm group glow-cyan"
          >
            <span>$ cat /portfolio/projects/archive.db</span>
            <span className="text-muted-foreground group-hover:text-cyan/85 transition-colors">
              (Show all 30+ repositories)
            </span>
            <ExternalLink className="size-4 group-hover:translate-x-0.5 transition-transform" />
          </motion.a>
        </div>
      </div>
    </section>
  );
}
